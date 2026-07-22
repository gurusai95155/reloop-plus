const ALLOWED_DECISIONS = ['RESALE', 'REPAIR', 'RECYCLE'];
const ALLOWED_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'];

export function validateAIDecision(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!ALLOWED_DECISIONS.includes(obj.decision)) return false;
  if (typeof obj.reason !== 'string' || !obj.reason.trim()) return false;
  if (!ALLOWED_CONFIDENCE.includes(obj.confidence)) return false;
  return true;
}

export function sanitizeDecision(obj) {
  return {
    decision: ALLOWED_DECISIONS.includes(obj.decision) ? obj.decision : 'RECYCLE',
    reason: String(obj.reason || 'No reason provided').trim().slice(0, 500),
    confidence: ALLOWED_CONFIDENCE.includes(obj.confidence) ? obj.confidence : 'MEDIUM',
  };
}

export function validateItemInput(body) {
  const { description, category, condition, age } = body || {};
  if (typeof description !== 'string' || !description.trim()) return { valid: false, error: 'Description is required' };
  return {
    valid: true,
    data: {
      description: description.trim().slice(0, 2000),
      category: typeof category === 'string' ? category.trim().slice(0, 100) : null,
      condition: typeof condition === 'string' ? condition.trim().slice(0, 50) : null,
      age: typeof age === 'string' ? age.trim().slice(0, 50) : null,
    },
  };
}
