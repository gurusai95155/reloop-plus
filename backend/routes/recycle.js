import { Router } from 'express';
import {
  getRecycleRequests,
  createRecycleRequest,
  acceptRecycleRequest,
  updateRecycleStatus,
} from '../db/store.js';

const router = Router();

router.get('/requests', async (req, res) => {
  const { userId, workerId, status } = req.query;
  try {
    const list = await getRecycleRequests({ userId, workerId, status });
    res.json(list);
  } catch (err) {
    console.error('Error fetching recycle requests:', err);
    res.status(500).json({ error: 'Failed to fetch recycle requests' });
  }
});

router.get('/requests/available', async (req, res) => {
  try {
    const list = await getRecycleRequests({ status: 'PENDING' });
    res.json(list);
  } catch (err) {
    console.error('Error fetching available recycle requests:', err);
    res.status(500).json({ error: 'Failed to fetch available requests' });
  }
});

router.post('/requests', async (req, res) => {
  const { userId, userEmail, description, category, condition, age, aiDecision, choice } = req.body || {};
  if (!userId || !description) return res.status(400).json({ error: 'userId and description required' });

  try {
    const req_ = await createRecycleRequest({
      userId,
      userEmail,
      description,
      category,
      condition,
      age,
      aiDecision,
      choice,
    });
    res.status(201).json(req_);
  } catch (err) {
    console.error('Error creating recycle request:', err);
    res.status(500).json({ error: 'Failed to create recycle request' });
  }
});

router.post('/requests/:id/accept', async (req, res) => {
  const { workerId, workerEmail } = req.body || {};
  if (!workerId) return res.status(400).json({ error: 'workerId required' });

  try {
    const updated = await acceptRecycleRequest(req.params.id, workerId, workerEmail);
    if (!updated) return res.status(404).json({ error: 'Request not found or already accepted' });
    res.json(updated);
  } catch (err) {
    console.error('Error accepting recycle request:', err);
    res.status(500).json({ error: 'Failed to accept recycle request' });
  }
});

router.patch('/requests/:id/status', async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const updated = await updateRecycleStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating recycle status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
