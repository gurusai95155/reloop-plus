# 🚀 Reloop Plus Deployment Guide

This guide covers two deployment strategies for Reloop Plus:
1. **Option A (Recommended for Demos & Portfolios):** Free/Low-Cost Cloud Deployment (Vercel + Render/Railway + Neon PostgreSQL + Google Gemini API).
2. **Option B (Self-Hosted Sovereign):** Ubuntu VPS with Docker / Systemd, Ollama (Llama 3.2), and self-hosted PostgreSQL.

---

## Option A: Free Cloud Deployment (Recommended)

### Architecture
- **Frontend:** [Vercel](https://vercel.com/) (Fast static global CDN, automated CI/CD from GitHub)
- **Backend:** [Render](https://render.com/) or [Railway](https://railway.app/) (Free/low-cost Node.js web service)
- **Database:** [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) (Serverless free-tier PostgreSQL)
- **AI Engine:** [Google Gemini 1.5 Flash](https://aistudio.google.com/) (Zero RAM cost, fast structured JSON responses)

---

### Step 1: Set Up Cloud PostgreSQL (Neon or Supabase)
1. Go to [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) and create a free project.
2. Copy your PostgreSQL connection string (`postgresql://username:password@ep-xyz.neon.tech/reloop_db?sslmode=require`).
3. *(Optional)* Open the SQL Editor in your database console and run the contents of [`backend/db/init.sql`](backend/db/init.sql). 
   *(Note: If you skip this, Reloop Plus automatically checks and initializes all tables on first startup!)*

---

### Step 2: Deploy the Backend to Render or Railway
1. Push your repository to your GitHub account (`https://github.com/gurusai95155/reloop-`).
2. Log into [Render.com](https://render.com/) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following build settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. In **Environment Variables**, add:
   - `PORT`: `3001`
   - `DATABASE_URL`: *(Your connection string from Step 1)*
   - `DATABASE_SSL`: `true`
   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: *(Get your free key at [aistudio.google.com](https://aistudio.google.com/))*
   - `CLIENT_URL`: `https://your-frontend.vercel.app` *(update once frontend is deployed)*
6. Deploy! Render will give you a public URL like `https://reloop-backend.onrender.com`.
7. Verify health at `https://reloop-backend.onrender.com/api/health`.

---

### Step 3: Deploy the Frontend to Vercel
1. Log into [Vercel.com](https://vercel.com/) and click **Add New > Project**.
2. Select your `reloop-` repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://reloop-backend.onrender.com/api` *(Your Render backend URL followed by `/api`)*
5. Click **Deploy**. Vercel will deploy your frontend with automatic SSL and SPA routing configured via `frontend/vercel.json`.
6. Copy your frontend Vercel URL and add it to `CLIENT_URL` in your Render backend settings so CORS allows requests.

---

## Option B: Self-Hosted Ubuntu VPS Deployment

Ideal if you want 100% self-hosted infrastructure with Ollama running Llama 3.2.

### Prerequisites
- Ubuntu 22.04 / 24.04 VPS with **at least 8 GB RAM** (16 GB recommended for smooth Llama 3.2 execution).
- Available on DigitalOcean, Hetzner, AWS EC2 (`t3.large` or `c6a.xlarge`), Linode, or GCP.

---

### Step 1: Server Setup & Dependencies
Connect to your VPS via SSH:
```bash
ssh root@your-server-ip
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx postgresql postgresql-contrib
```

Install Node.js (v20+ LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

### Step 2: Install & Configure Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh

# Pull Llama 3.2 model
ollama pull llama3.2

# Verify Ollama service is active
systemctl status ollama
```

---

### Step 3: Configure PostgreSQL
```bash
sudo -u postgres psql
```
In the psql shell:
```sql
CREATE DATABASE reloop_db;
CREATE USER reloop_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE reloop_db TO reloop_user;
\q
```

Initialize tables:
```bash
sudo -u postgres psql -d reloop_db -f backend/db/init.sql
```

---

### Step 4: Clone & Build Application
```bash
cd /var/www
git clone https://github.com/gurusai95155/reloop-plus.git reloop
cd reloop

# 1. Backend Setup
cd backend
npm install --production
cp .env.example .env
nano .env
```
In `.env`:
```ini
PORT=3001
CLIENT_URL=https://yourdomain.com
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=postgresql://reloop_user:your_secure_password@127.0.0.1:5432/reloop_db
DATABASE_SSL=false
```

Start backend with PM2 for background process management:
```bash
sudo npm install -g pm2
pm2 start server.js --name reloop-backend
pm2 startup
pm2 save
```

# 2. Frontend Build
```bash
cd ../frontend
npm install
npm run build
```
This builds static assets to `/var/www/reloop/frontend/dist`.

---

### Step 5: Configure Nginx Reverse Proxy & HTTPS
Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/reloop
```
Paste:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React Frontend
    location / {
        root /var/www/reloop/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node Express backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/reloop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Install free SSL certificate with Let's Encrypt Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Verification & Health Check

After completing either Option A or Option B, verify your deployment:
- **Web UI:** Visit your custom domain or Vercel URL.
- **Health Check Endpoint:** Visit `https://your-api-domain/api/health` — it should return:
  ```json
  {
    "ok": true,
    "storage": "postgresql",
    "ai": "gemini" 
  }
  ```
- **Test User Workflow:**
  1. Register or log in with demo account (`user@example.com` / `password123`).
  2. Evaluate an item to test the AI decision engine.
  3. Place a bid in the marketplace to test PostgreSQL transactions.
