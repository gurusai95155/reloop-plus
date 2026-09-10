import { Router } from 'express';
import { getUserHistory } from '../db/store.js';

const router = Router();

// Token format: mock-{userId}-{timestamp}
function getUserIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const parts = token.split('-');
  return parts.length >= 2 ? parts[1] : null;
}

// Aggregate real history from resale (sold), repair, recycle
router.get('/history', async (req, res) => {
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  try {
    const history = await getUserHistory(userId);
    res.json(history);
  } catch (err) {
    console.error('Error fetching user history:', err);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
});

export default router;
