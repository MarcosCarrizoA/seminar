# Exchange Student Events App

Monorepo with:

- `backend/`: Node.js + Express + TypeScript + SQLite API
- `frontend/`: React + Vite + TypeScript UI

## Running backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`.

## Running frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment (backend)

Copy `.env.example` to `.env` and adjust:

- `JWT_SECRET`: random secret string
- `SQLITE_PATH`: path to SQLite file (default `./data/app.db`)
- `SMTP_*`: optional SMTP config for email reminders
- `REMINDER_HOURS_BEFORE`: hours before event to send reminder (default 24)

