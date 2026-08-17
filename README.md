# CalorieTrack

A full-stack, AI-enhanced calorie, macronutrient, and body weight progress tracking application built with TypeScript, React, Node.js/Express, PostgreSQL (Prisma), and Google Gemini.

---

## Features

- **Production Authentication & Multi-Device Sessions**: Google Identity Services + Server-Side ID Token verification, Email/Password auth, Short-lived JWT access tokens + HttpOnly refresh token cookies with automatic rotation, strict zero-grace reuse revocation, multi-device management, and single-flight frontend retry.
- **Mifflin-St Jeor TDEE & Target Engine**: Automatic calculation of BMR, TDEE, calorie deficit/surplus, and macronutrient targets based on user biometric profile and goals.
- **Deterministic Food Tracking**: Comprehensive verified food catalog, search with debounce, granular meal logging (Breakfast, Lunch, Dinner, Snacks), and daily macro breakdown.
- **Weight & Goal Progression**: Daily weight logging, starting weight historical protection, total weight change, and goal progress percentages.
- **AI-Powered Natural Language Food Logging**: Powered by Google Gemini (`gemini-3.5-flash` / Interactions API) with structured portion unit conversions and zero math hallucinations (deterministic food calculations).
- **Timezone-Aware Nutritional Analytics**: Contiguous time-series trends, active logging streak counters, budget adherence ($\pm 10\%$), estimated caloric weight impact ($\Delta E / 7700\text{ kg}$), and custom interactive SVG charts with 365-day range enforcement.
- **AI Nutrition Coach**: Grounded, stateless nutrition coaching providing qualitative habit advice and meal ideas grounded exclusively in verified application data.
- **Production Hardened**: Helmet security headers, 100KB payload protection, in-memory sliding-window rate limiters, sanitized logging, and strict multi-tenant isolation.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v7, Google Identity Services (GIS)
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, Helmet, Zod, bcryptjs, jsonwebtoken, google-auth-library, cookie-parser, cors
- **Database**: PostgreSQL (Prisma ORM)
- **AI**: Google Gen AI SDK (`@google/genai` / `gemini-3.5-flash`)

---

## Monorepo Project Structure

```
calorie-tracker/
├── package.json             # Monorepo workspaces configuration
├── DEPLOYMENT.md            # Production deployment guide
├── README.md                # Project documentation
├── backend/                 # Node.js + Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma    # PostgreSQL Schema
│   │   └── migrations/      # Production migrations
│   └── src/
│       ├── config/          # Environment & Prisma client
│       ├── controllers/     # Route controllers
│       ├── middleware/      # Auth, Helmet, Rate limiting, Error, Logger
│       ├── routes/          # API route definitions
│       ├── schemas/         # Zod validation schemas
│       ├── services/        # Deterministic domain calculations & AI logic
│       ├── seeds/           # Development food dataset seed
│       └── tests/           # 8 automated test suites (200+ assertions)
└── frontend/                # React + Vite Client
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vercel.json          # SPA routing configuration
    └── src/
        ├── components/      # UI modals, charts, navigation, GoogleSignInButton
        ├── context/         # AuthContext with in-memory token & silent refresh
        ├── pages/           # Dashboard, Food, Progress, AI Log, Analytics, Coach
        └── services/        # Authenticated API client with 401 retry
```

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in `backend/` and `frontend/`:
```bash
# In backend/.env:
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/calorietrack_db?sslmode=disable
JWT_SECRET=your_long_random_jwt_secret_at_least_16_chars
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# In frontend/.env:
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### 3. Setup Database & Seed Data
```bash
npm run prisma:migrate --workspace=backend
npm run seed --workspace=backend
```

### 4. Run Development Servers
```bash
npm run dev
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## Running Automated Tests

Run the complete 8-suite test verification (200+ assertions):
```bash
cd backend
npx tsx src/tests/session-auth.test.ts
npx tsx src/tests/food-tracking.test.ts
npx tsx src/tests/weight-tracking.test.ts
npx tsx src/tests/ai-food.test.ts
npx tsx src/tests/analytics.test.ts
npx tsx src/tests/ai-coach.test.ts
npx tsx src/tests/production-hardening.test.ts
npx tsx src/tests/google-auth.test.ts
```

---

## Production Deployment

For complete instructions on deploying to **Vercel** (Frontend), **Render/Railway** (Backend), and **Neon** (PostgreSQL), refer to [DEPLOYMENT.md](DEPLOYMENT.md).
