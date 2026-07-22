# Reloop Plus – Backend

Node.js + Express, in-memory storage only.

## Setup

```bash
npm install
npm start
```

API base: `http://localhost:3001`

- `POST /api/auth/register` – body: `{ email, password, role: "USER" | "WORKER" }`
- `POST /api/auth/login` – body: `{ email, password }`
- `POST /api/ai/recommend` – body: `{ description, category?, condition?, age? }`
- Resale: `/api/resale/items`, `/api/resale/items/:id/bids`, etc.
- Repair: `/api/repair/requests`, `/api/repair/requests/:id/accept`, etc.
- Recycle: `/api/recycle/requests`, `/api/recycle/requests/:id/accept`, etc.

Optional: run Ollama locally for AI; otherwise rule-based fallback is used.
