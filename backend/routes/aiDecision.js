import { Router } from 'express';
import { getAIDecision } from '../services/aiService.js';
import { validateItemInput } from '../utils/validator.js';

const router = Router();

router.post('/recommend', async (req, res) => {
  const validation = validateItemInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  try {
    const result = await getAIDecision(validation.data);
    if (!result.success) {
      return res.status(502).json({ error: 'AI recommendation failed' });
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
