import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb, isDbConnected } from './db/store.js';
import auth from './routes/auth.js';
import aiDecision from './routes/aiDecision.js';
import resale from './routes/resale.js';
import repair from './routes/repair.js';
import recycle from './routes/recycle.js';
import user from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: true, // Dynamically reflects request origin so browser credential/preflight checks succeed
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());
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
    storage: isDbConnected() ? 'mongodb' : (process.env.MONGODB_URI ? 'connecting-mongodb' : 'in-memory'),
    ai: process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OLLAMA_URL ? 'ollama' : 'heuristic'),
  });
});

// Initialize MongoDB database connection
initDb().catch((err) => console.error('Database initialization error:', err));

app.listen(PORT, () => {
  console.log(`Reloop Plus backend running on http://localhost:${PORT}`);
});
