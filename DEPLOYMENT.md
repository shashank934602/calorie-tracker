# CalorieTrack — Production Deployment Guide

A step-by-step production deployment guide for the CalorieTrack full-stack application.

---

## 1. System Architecture Overview

```
 [ Client Web App ]
 (React + Vite SPA)
 (Hosted on Vercel)
         │
         │  HTTPS / JSON / HttpOnly Cookie (credentials: 'include')
         ▼
 [ Backend API ]
 (Node.js + Express + Helmet + Rate Limiters)
 (Hosted on Render or Railway)
    ┌────┴──────────────────────────┐
    ▼                               ▼
 [ Database ]                 [ Google Gemini AI ]
 (PostgreSQL on Neon)         (gemini-3.5-flash / Server-Only)
```

---

## 2. Environment Variables Specification

| Variable | Target | Required | Purpose & Example Value |
|---|---|---|---|
| `VITE_API_URL` | Frontend | **Yes** | Public URL of the deployed backend API (e.g. `https://calorietrack-api.onrender.com`). |
| `PORT` | Backend | Optional | Port for the Express server (default: `5000` or assigned by host `$PORT`). |
| `NODE_ENV` | Backend | **Yes** | Environment mode. Set to `production` in production. |
| `CORS_ORIGIN` | Backend | **Yes** | Exact public URL of the deployed frontend SPA (e.g. `https://calorietrack.vercel.app`). No trailing slash. |
| `DATABASE_URL` | Backend | **Yes** | PostgreSQL connection string from Neon (e.g. `postgresql://user:pass@ep-xyz.neon.tech/calorietrack?sslmode=require`). |
| `JWT_SECRET` | Backend | **Yes** | High-entropy random string (at least 32+ characters) for signing short-lived JWT access tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Backend | Optional | Lifetime of access token (default: `15m`). |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Backend | Optional | Lifetime of refresh token session (default: `30`). |
| `GEMINI_API_KEY` | Backend | **Yes** | Google Gemini API Key for AI food parsing and AI nutrition coaching. **Never expose to frontend.** |
| `GEMINI_MODEL` | Backend | Optional | Model identifier (default: `gemini-3.5-flash`). |
| `GOOGLE_CLIENT_ID` | Backend | Optional | Google OAuth Client ID for server-side ID token verification. |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Optional | Google OAuth Client ID for Google Identity Services frontend button. |
| `TRUST_PROXY` | Backend | Optional | Set to `true` when deployed behind reverse proxies (Render, Railway, Cloudflare). |
| `COOKIE_SAME_SITE` | Backend | Optional | Set to `none` when frontend and backend are hosted on separate domains (e.g. Vercel + Render). |

---

## 3. Database Setup (Neon PostgreSQL)

1. Create a PostgreSQL project on [Neon](https://neon.tech).
2. Copy the connection string (`postgresql://...`).
3. Ensure SSL is enabled (`sslmode=require` or `sslmode=verify-full`).
4. Set the `DATABASE_URL` environment variable on your backend host.

---

## 4. Backend Deployment (Render or Railway)

### On Render / Railway:
- **Build Command**:
  ```bash
  npm run build --workspace=backend
  ```
  *(This automatically generates the Prisma Client via `prisma generate` and compiles TypeScript with `tsc`)*
- **Start Command**:
  ```bash
  npm run start --workspace=backend
  ```
  *(Or `node dist/server.js` within the `backend/` directory)*
- **Pre-Deploy / Migration Step**:
  Run Prisma database migrations before launching the application process:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  ```
  *(Optional: Seed standard food items without dropping user data: `npm run seed --workspace=backend`)*

---

## 5. Frontend Deployment (Vercel)

### On Vercel:
1. Connect your Git repository.
2. Configure project settings:
   - **Root Directory**: `frontend` (or set Root to `.` and Build to `npm run build --workspace=frontend`).
   - **Framework Preset**: Vite.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com`
4. Configure SPA client-side routing rewrites (`frontend/vercel.json`):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 6. Security, Cookie & CORS Configuration

### Cross-Domain Cookie Handling
When Frontend (`*.vercel.app`) and Backend (`*.onrender.com`) are on different domains:
1. Set `COOKIE_SAME_SITE=none` on the backend.
2. In production (`NODE_ENV=production`), `secure: true` and `httpOnly: true` are enforced automatically.
3. In `CORS_ORIGIN`, provide the exact frontend domain (e.g. `https://calorietrack.vercel.app`).
4. The client uses `credentials: 'include'` for all fetch requests.

---

## 7. Production Verification Checklist

```markdown
- [ ] 1. Database migrations deployed (`prisma migrate deploy`)
- [ ] 2. Backend health check returns 200 (`GET /api/health`)
- [ ] 3. Security headers verified (Helmet, nosniff, frame protection)
- [ ] 4. Register new user account
- [ ] 5. Onboarding profile setup & target calculation
- [ ] 6. Search foods and log a meal entry
- [ ] 7. Log a weight entry and verify progress calculation
- [ ] 8. Test AI Food Logging with natural language
- [ ] 9. View Analytics page and check time-series charts
- [ ] 10. Test AI Nutrition Coach chat
- [ ] 11. Refresh browser to verify silent session hydration via HttpOnly cookie
- [ ] 12. Log out and verify session revocation
```
