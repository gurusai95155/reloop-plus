import express from 'express';
import cors from 'cors';
import auth from './routes/auth.js';
import aiDecision from './routes/aiDecision.js';
import resale from './routes/resale.js';
import repair from './routes/repair.js';
import recycle from './routes/recycle.js';
import user from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', auth);
app.use('/api/ai', aiDecision);
app.use('/api/resale', resale);
app.use('/api/repair', repair);
app.use('/api/recycle', recycle);
app.use('/api/user', user);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Reloop Plus backend running on http://localhost:${PORT}`);
});
