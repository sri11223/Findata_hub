# FinData Hub — Deployment Guide

Complete step-by-step guide to deploy the full-stack application.

| Service | Platform | Purpose |
|---------|----------|---------|
| Database | **Neon** (neon.tech) | PostgreSQL database |
| Backend API | **Render** (render.com) | Node.js + Express server |
| Frontend | **Vercel** (vercel.com) | React + Vite static app |

---

## Step 1: Set Up Neon Database

1. Go to [https://neon.tech](https://neon.tech) and sign up / log in
2. Click **"New Project"**
3. Name it `findata-hub`, select a region close to you, click **Create**
4. Once created, copy the **Connection String** — it looks like:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
5. **Save this string** — you'll need it for Render

---

## Step 2: Push Code to GitHub

Before deploying, push the entire project to a GitHub repository:

```bash
cd "d:\FinData Hub"
git init
git add .
git commit -m "Initial commit: FinData Hub full-stack"
git remote add origin https://github.com/YOUR_USERNAME/findata-hub.git
git branch -M main
git push -u origin main
```

> **Important**: Make sure `.env` is in your `.gitignore` so secrets don't get committed.

---

## Step 3: Deploy Backend on Render

1. Go to [https://render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `findata-hub-api` |
| **Root Directory** | *(leave empty — the backend is at the repo root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Under **"Environment Variables"**, add the following:

### Backend Environment Variables (Render)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | *(paste your Neon connection string)* |
| `JWT_ACCESS_SECRET` | *(generate a random 64-char string — see below)* |
| `JWT_REFRESH_SECRET` | *(generate a different random 64-char string)* |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `CORS_ORIGIN` | *(your Vercel URL — you'll update this after Step 4)* |
| `LOG_LEVEL` | `info` |

**To generate random secrets**, run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Run it **twice** to get two separate secrets for access and refresh tokens.

6. Click **"Create Web Service"**
7. Wait for the build to complete (2-3 minutes)
8. Once deployed, Render gives you a URL like:
   ```
   https://findata-hub-api.onrender.com
   ```
9. **Test it**: Open `https://findata-hub-api.onrender.com/health` in your browser — you should see:
   ```json
   { "success": true, "message": "FinData Hub API is running" }
   ```

### Seed the Database

After the first successful deploy, go to the **Shell** tab in Render and run:
```bash
npx ts-node prisma/seed.ts
```
Or connect to Neon's SQL editor and verify tables exist.

> **If Shell is not available on the free tier**, seed locally by temporarily using the Neon connection string:
> ```bash
> # In your local project directory
> DATABASE_URL="your-neon-connection-string" npx ts-node prisma/seed.ts
> ```

---

## Step 4: Deploy Frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up / log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Under **"Environment Variables"**, add:

### Frontend Environment Variable (Vercel)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://findata-hub-api.onrender.com` *(your Render URL, NO trailing slash)* |

6. Click **"Deploy"**
7. Once deployed, Vercel gives you a URL like:
   ```
   https://findata-hub.vercel.app
   ```

---

## Step 5: Update CORS on Render

Now that you have your Vercel URL, go back to **Render**:

1. Go to your backend service → **Environment** tab
2. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   https://findata-hub.vercel.app
   ```
   (If you want to allow multiple origins, comma-separate them:
   `https://findata-hub.vercel.app,http://localhost:5173`)
3. Save — Render will auto-redeploy

---

## Step 6: Seed Database (if not done in Step 3)

Run the seed script locally pointing to your Neon database:

```bash
cd "d:\FinData Hub"
$env:DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
npx ts-node prisma/seed.ts
```

You should see:
```
🌱 Starting database seed...
✅ Seeded 10 categories
✅ Seeded 4 users
✅ Seeded 8 financial records
📋 Demo user credentials:
  superadmin@findata.com  →  SuperAdmin@123  (SUPER_ADMIN)
  admin@findata.com       →  Admin@123456    (ADMIN)
  analyst@findata.com     →  Analyst@123     (ANALYST)
  viewer@findata.com      →  Viewer@1234     (VIEWER)
🎉 Seed complete!
```

---

## Summary: All Environment Variables

### Backend (Render)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=your-64-char-random-hex-string
JWT_REFRESH_SECRET=your-different-64-char-random-hex-string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=https://your-app.vercel.app
LOG_LEVEL=info
```

### Frontend (Vercel)

```env
VITE_API_URL=https://findata-hub-api.onrender.com
```

---

## Verification Checklist

- [ ] Neon database created and connection string copied
- [ ] Backend deployed to Render — `/health` returns OK
- [ ] Database migrated (tables exist in Neon)
- [ ] Database seeded (demo users created)
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` set on Vercel to point to Render backend
- [ ] `CORS_ORIGIN` updated on Render to include Vercel URL
- [ ] Login works with `admin@findata.com` / `Admin@123456`
- [ ] Dashboard loads with charts and summary cards
- [ ] Records page shows seeded financial records

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend build fails on Render | Check Build Command is `npm install && npm run build` |
| `P1001` database connection error | Verify `DATABASE_URL` is correct and has `?sslmode=require` |
| CORS errors in browser console | Update `CORS_ORIGIN` on Render to match your Vercel URL exactly |
| Login returns 401 | Run the seed script — demo users may not exist yet |
| Frontend shows blank page | Check `VITE_API_URL` is set correctly (no trailing `/`) |
| Vercel 404 on page refresh | `vercel.json` with SPA rewrites should handle this — check it exists in `frontend/` |
| Render free tier sleeps | First request after idle takes ~30s to cold-start |
