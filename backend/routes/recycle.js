import { Router } from 'express';

const router = Router();
const requests = [];
let requestId = 1;

// Seed data so Past History shows recycle entries for first user (userId "1")
function seedRecycleData() {
  if (requests.length > 0) return;
  const now = new Date().toISOString();
  requests.push({
    id: '1',
    userId: '1',
    userEmail: 'user@example.com',
    description: 'Old printer',
    category: 'Electronics',
    condition: 'Non-working',
    age: '8 years',
    aiDecision: 'RECYCLE',
    choice: 'RESPONSIBLE',
    status: 'COMPLETED',
    workerId: 'w1',
    workerEmail: 'worker@example.com',
    recyclingCenter: 'E-Waste Center',
    environmentalImpact: 'Materials recovered',
    createdAt: now,
    updatedAt: now,
  });
  requestId = 2;
}
seedRecycleData();

router.get('/requests', (req, res) => {
  const { userId, workerId, status } = req.query;
  let list = [...requests];
  if (userId) list = list.filter((r) => r.userId === userId);
  if (workerId) list = list.filter((r) => r.workerId === workerId);
  if (status) list = list.filter((r) => r.status === status);
  res.json(list);
});

router.get('/requests/available', (req, res) => {
  res.json(requests.filter((r) => r.status === 'PENDING'));
});

router.post('/requests', (req, res) => {
  const { userId, userEmail, description, category, condition, age, aiDecision, choice } = req.body || {};
  if (!userId || !description) return res.status(400).json({ error: 'userId and description required' });
  const req_ = {
    id: String(requestId++),
    userId,
    userEmail: userEmail || '',
    description: String(description).slice(0, 2000),
    category: category || null,
    condition: condition || null,
    age: age || null,
    aiDecision: aiDecision || null,
    choice: choice === 'VALUE' ? 'VALUE' : 'RESPONSIBLE',
    status: 'PENDING',
    workerId: null,
    workerEmail: null,
    estimatedValue: choice === 'VALUE' ? Math.round(5 + Math.random() * 45) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  requests.push(req_);
  res.status(201).json(req_);
});

router.post('/requests/:id/accept', (req, res) => {
  const r = requests.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found' });
  if (r.status !== 'PENDING') return res.status(400).json({ error: 'Already accepted or completed' });
  const { workerId, workerEmail } = req.body || {};
  if (!workerId) return res.status(400).json({ error: 'workerId required' });
  r.workerId = workerId;
  r.workerEmail = workerEmail || '';
  r.status = 'ACCEPTED';
  r.updatedAt = new Date().toISOString();
  res.json(r);
});

router.patch('/requests/:id/status', (req, res) => {
  const r = requests.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found' });
  const { status } = req.body || {};
  const allowed = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (r.status === 'PENDING' && status !== 'ACCEPTED') return res.status(400).json({ error: 'Must accept first' });
  r.status = status;
  r.updatedAt = new Date().toISOString();
  res.json(r);
});

export default router;
export { requests as recycleRequests };
