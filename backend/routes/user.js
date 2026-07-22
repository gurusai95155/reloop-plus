import { Router } from 'express';
import { items } from './resale.js';
import { repairRequests } from './repair.js';
import { recycleRequests } from './recycle.js';

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
router.get('/history', (req, res) => {
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  const history = [];

  const uid = String(userId);
  // Resale: sold items owned by user
  items
    .filter((i) => String(i.userId) === uid && i.status === 'SOLD')
    .forEach((i) => {
      history.push({
        id: `resale-${i.id}`,
        type: 'RESALE',
        description: i.description,
        category: i.category,
        condition: i.condition,
        status: i.status,
        final_price: i.final_price,
        buyer_email: i.buyer_email,
        created_at: i.createdAt,
      });
    });

  // Repair requests by user
  repairRequests
    .filter((r) => String(r.userId) === uid)
    .forEach((r) => {
      history.push({
        id: `repair-${r.id}`,
        type: 'REPAIR',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        worker_notes: r.workerNotes || null,
        estimated_completion: r.updatedAt,
        created_at: r.createdAt,
      });
    });

  // Recycle requests by user
  recycleRequests
    .filter((r) => String(r.userId) === uid)
    .forEach((r) => {
      history.push({
        id: `recycle-${r.id}`,
        type: 'RECYCLE',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        recycling_center: r.recyclingCenter || null,
        environmental_impact: r.environmentalImpact || null,
        created_at: r.createdAt,
      });
    });

  history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(history);
});

export default router;
