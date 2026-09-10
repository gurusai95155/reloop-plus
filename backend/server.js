import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/store.js';
import auth from './routes/auth.js';
import aiDecision from './routes/aiDecision.js';
import resale from './routes/resale.js';
import repair from './routes/repair.js';
import recycle from './routes/recycle.js';
import user from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : '*';
app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', auth);
app.use('/api/ai', aiDecision);
app.use('/api/resale', resale);
app.use('/api/repair', repair);
app.use('/api/recycle', recycle);
app.use('/api/user', user);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    storage: process.env.DATABASE_URL ? 'postgresql' : 'in-memory',
    ai: process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OLLAMA_URL ? 'ollama' : 'heuristic'),
  });
});

// Initialize database schema if PostgreSQL is configured
initDb().catch((err) => console.error('Database initialization error:', err));

app.listen(PORT, () => {
  console.log(`Reloop Plus backend running on http://localhost:${PORT}`);
});
