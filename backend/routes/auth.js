import { Router } from 'express';

const router = Router();
const users = new Map(); // email -> { id, email, password, role }
let nextId = 1;

router.post('/register', (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  if (!['USER', 'WORKER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be USER or WORKER' });
  }
  const normalized = String(email).trim().toLowerCase();
  if (users.has(normalized)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const user = {
    id: String(nextId++),
    email: normalized,
    password: String(password),
    role,
  };
  users.set(normalized, user);
  res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
    token: `mock-${user.id}-${Date.now()}`,
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const normalized = String(email).trim().toLowerCase();
  const user = users.get(normalized);
  if (!user || user.password !== String(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    token: `mock-${user.id}-${Date.now()}`,
  });
});

export default router;
export { users };
