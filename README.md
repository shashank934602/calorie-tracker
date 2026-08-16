# CalorieTrack

An AI-powered calorie and nutrition tracking application built with a modern full-stack TypeScript architecture.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js, TypeScript, Zod, CORS
- **Database / ORM**: PostgreSQL, Prisma ORM
- **Authentication**: JWT, bcrypt *(to be implemented in next phase)*

---

## Monorepo Project Structure

```
calorie-tracker/
├── package.json             # Root monorepo scripts & workspaces configuration
├── .gitignore               # Root git ignore rules
├── README.md                # Project documentation
├── backend/                 # Node.js + Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env
│   ├── prisma/
│   │   └── schema.prisma    # Prisma PostgreSQL schema
│   └── src/
│       ├── config/
│       │   └── env.ts       # Type-safe Zod environment validation
│       ├── controllers/
│       │   └── health.controller.ts
│       ├── routes/
│       │   └── health.routes.ts
│       ├── app.ts           # Express app & middleware setup
│       └── server.ts        # Server entry point
└── frontend/                # React + Vite Client
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts       # Vite config + API proxy
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    ├── .env
    └── src/
        ├── services/
        │   └── api.ts       # Typed API client
        ├── App.tsx          # System verification dashboard
        ├── main.tsx         # React root
        └── index.css        # Tailwind styling & theme
```

---

## Quick Start

### 1. Install Dependencies
From the root directory:
```bash
npm install
```

### 2. Run Both Frontend and Backend Concurrently
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 3. Run Separately (Optional)
```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```
