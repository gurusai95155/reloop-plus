import { Router } from 'express';
import { findUserByEmail, createUser } from '../db/store.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  if (!['USER', 'WORKER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be USER or WORKER' });
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  try {
    const user = await createUser({ email, password, role });
    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      token: `mock-${user.id}-${Date.now()}`,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await findUserByEmail(email);
    if (!user || user.password !== String(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      token: `mock-${user.id}-${Date.now()}`,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
