import axios from 'axios';
import { validateAIDecision, sanitizeDecision } from '../utils/validator.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_PROVIDER = process.env.AI_PROVIDER || (GEMINI_API_KEY ? 'gemini' : 'ollama');

const SYSTEM_PROMPT = `You are a sustainability decision assistant.

Your task is to recommend ONE best action for an unused household item.

You will receive:
- optional structured fields
- a free-text English description from the user

You must infer missing information if needed.

Allowed decisions:
- RESALE
- REPAIR
- RECYCLE

You must consider:
- usability
- repair feasibility
- resale realism
- sustainability impact

Respond ONLY in valid JSON using this format:

{
  "decision": "RESALE | REPAIR | RECYCLE",
  "reason": "simple, human-readable explanation",
  "confidence": "HIGH | MEDIUM | LOW"
}

Do NOT include any extra text.`;

function buildUserMessage(data) {
  const parts = [`User description: ${data.description}`];
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.condition) parts.push(`Condition: ${data.condition}`);
  if (data.age) parts.push(`Age: ${data.age}`);
  return parts.join('\n');
}

function ruleBasedFallback(data) {
  const d = (data.description || '').toLowerCase();
  let decision = 'RECYCLE';
  let reason = 'Default recommendation when AI is unavailable.';
  let confidence = 'MEDIUM';

  if (/\b(crack|broken|battery|screen|not working|repair|fix)\b/.test(d) && !/\b(completely|totally|destroyed|scrap)\b/.test(d)) {
    decision = 'REPAIR';
    reason = 'Description suggests repairable issues (e.g. screen, battery). Repair can extend product life.';
    confidence = 'MEDIUM';
  } else if (/\b(working|good condition|gently used|like new|barely used)\b/.test(d) || /\b(sell|resell|value)\b/.test(d)) {
    decision = 'RESALE';
    reason = 'Item appears usable; resale recovers value and keeps it in use.';
    confidence = 'MEDIUM';
  } else if (/\b(recycle|scrap|dispose|junk|old|obsolete)\b/.test(d)) {
    decision = 'RECYCLE';
    reason = 'Description suggests end-of-life or disposal; recycling is appropriate.';
    confidence = 'MEDIUM';
  }

  return { decision, reason, confidence };
}

function extractJSON(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}') + 1;
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end));
  } catch {
    return null;
  }
}

async function callGemini(userMessage) {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await axios.post(
    url,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    },
    { timeout: 15000 }
  );
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return extractJSON(text);
}

async function callOllama(userMessage) {
  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      stream: false,
    },
    { timeout: 30000 }
  );
  const content = res.data?.message?.content;
  return extractJSON(content);
}

export async function getAIDecision(data) {
  const userMessage = buildUserMessage(data);

  // 1. Try Gemini if configured as primary
  if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    try {
      const parsed = await callGemini(userMessage);
      if (parsed && validateAIDecision(parsed)) {
        return { success: true, data: sanitizeDecision(parsed), provider: 'gemini' };
      }
    } catch (err) {
      console.warn('[AI] Gemini API error, attempting fallback:', err.message);
    }
  }

  // 2. Try Ollama (local / VPS self-hosted)
  try {
    const parsed = await callOllama(userMessage);
    if (parsed && validateAIDecision(parsed)) {
      return { success: true, data: sanitizeDecision(parsed), provider: 'ollama' };
    }
  } catch (_) {
    // Ollama unreachable or timed out
  }

  // 3. Try Gemini as secondary fallback if key is present
  if (AI_PROVIDER !== 'gemini' && GEMINI_API_KEY) {
    try {
      const parsed = await callGemini(userMessage);
      if (parsed && validateAIDecision(parsed)) {
        return { success: true, data: sanitizeDecision(parsed), provider: 'gemini' };
      }
    } catch (_) {}
  }

  // 4. Built-in heuristic rule-based engine
  const fallback = ruleBasedFallback(data);
  return { success: true, data: sanitizeDecision(fallback), provider: 'heuristic' };
}
