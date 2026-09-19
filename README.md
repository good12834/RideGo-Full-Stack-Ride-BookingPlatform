# 🚗 RideGo — Full-Stack Ride Booking Platform

**RideGo AI Mobility** is a full-stack ride-hailing platform that connects passengers, drivers, and admins in a single real-time ecosystem. It features an AI-powered dispatch engine, live GPS ride tracking via WebSockets, Stripe-powered payments, fare estimation, promo codes, ratings, wallet top-ups, and an in-app AI copilot.

> **Zero-setup development:** the backend automatically spins up an in-memory MongoDB server when no persistent database is reachable, and provisions the protected operator accounts (admin + driver) + demo data on first boot — no `mongod` installation required.

---

## ✨ Features

### Passenger
- Book rides with live fare estimate (Economy, Comfort, XL)
- Real-time driver matching & live trip tracking (Socket.io)
- Stripe card checkout + wallet payments + cash
- Promo codes (e.g. `RIDE20`, `WELCOME5`)
- Ride history, ride detail with status timeline, driver ratings
- Trusted contacts & in-ride emergency trigger
- AI fare prediction and route insights

### Driver
- On/offline status & live location broadcast
- Accept / reject incoming ride requests
- Active trip flow with ride PIN verification & status transitions
- Earnings dashboard, ratings view, vehicle management

### Admin
- Overview KPIs & analytics dashboard
- User, driver, vehicle management (approve / reject / suspend)
- Ride & payment monitoring, manual ride cancellation
- Promo code CRUD, support ticket (complaint) management

### AI & Intelligence
- **AI Dynamic Dispatch** — algorithmic driver pairing (sub-second matching)
- **AI Fare Predictor** — fare prediction beyond simple distance math
- **AI Safety Sentinel** — route-adherence telemetry & anomaly detection
- **AI Copilot** — global chat assistant widget
- Optional upgrade to **Google Gemini** as the foundation model via `GEMINI_API_KEY`

---

## 🧱 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, Vite 5, React Router 6, Tailwind CSS, Leaflet (React Leaflet), Framer Motion, Socket.io-client, Axios, Lucide React, Stripe.js |
| Backend   | Node.js, Express 4, Socket.io, Mongoose (ODM) |
| Database  | MongoDB (persistent or in-memory via `mongodb-memory-server`) |
| Payments  | Stripe (Payment Intents, webhooks, wallet top-ups) |
| AI        | Google Gemini SDK (`@google/genai`) with an offline built-in neural engine fallback |
| Auth      | JWT (`jsonwebtoken`) + bcryptjs password hashing |
| Media     | Cloudinary (optional, driver vehicle photos), Multer |

---

## 📁 Project Structure

```
RideGo — Full-Stack-Ride-BookingPlatform/
├── backend/                      # Express API (port 5000)
│   ├── config/
│   │   └── db.js                 # Mongoose connection + in-memory fallback
│   ├── controllers/              # Route handlers
│   ├── middleware/               # auth, admin, upload
│   ├── models/                   # Mongoose models
│   ├── routes/                   # API route definitions
│   ├── scripts/
│   │   ├── devMemory.js          # Zero-setup dev launcher (in-memory DB)
│   │   └── smoke.js              # API smoke test script
│   ├── services/                 # AI dispatch, Gemini, Stripe, ride expiry
│   ├── socket/
│   │   └── rideSocket.js         # Socket.io real-time layer
│   ├── utils/                    # fare calculator, token helper, constants
│   ├── .env.example
│   ├── seed.js                   # Protected accounts + demo data seeder
│   └── server.js                 # App entry point
│
├── frontend/                     # React + Vite app (port 5174)
│   ├── src/
│   │   ├── components/           # Shared UI + AI widgets
│   │   ├── context/              # Auth, Ride state
│   │   ├── hooks/useSocket.jsx   # Socket.io connection hook
│   │   ├── pages/                # public / passenger / driver / admin
│   │   ├── services/api.js       # Axios API client
│   │   └── App.jsx               # Routes & providers
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── package.json                  # Root scripts (concurrently)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended) and npm
- Ports **5000** (API) and **5174** (Vite, strict port) must be free

### 1. Install dependencies

```bash
npm install               # repo root (concurrently)
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure environment variables

Copy the example env files and adjust as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| File      | Key variables                                                        |
|-----------|----------------------------------------------------------------------|
| `backend/.env` | `PORT`, `CLIENT_URL`, `MONGO_URI`, `JWT_SECRET`, Stripe & Gemini keys |
| `frontend/.env` | `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`      |

No keys are required to run locally — the app works out of the box with the built-in AI engine and demo payment flows. Add `GEMINI_API_KEY` to upgrade the AI engine, and Stripe keys for live card processing. **Never commit `.env` files.**

### 3. Run the app (dev)

```bash
npm run dev
```

This launches both processes concurrently:

- 🌐 **Frontend:** http://localhost:5174
- 🔌 **API:** http://localhost:5000 (`GET /api/health` → `{"ok":true,...}`)

The backend starts an in-memory MongoDB and provisions the protected operator accounts automatically. To run the two sides separately:

```bash
npm run server     # backend only  (npm run dev --prefix backend)
npm run client     # frontend only (npm run dev --prefix frontend)
```

> **Note:** if a MongoDB instance is already running on `127.0.0.1:27017`, it is reused instead of starting an in-memory one.

### 4. Seed data (optional)

If using a persistent MongoDB, seed the sample data manually:

```bash
npm run seed
```

### 5. Production build & start

```bash
npm run build      # builds the frontend bundle (vite build)
npm start          # starts the backend API (node server.js)
```

---

## 🔐 Protected Operator Accounts

RideGo ships **no demo logins**. Two accounts are provisioned by the platform operator and are
created automatically on every backend boot (and by the seeder) from `backend/.env`:

| Role   | Email              | Password source             |
|--------|--------------------|-----------------------------|
| Admin  | `admin@ridego.dev` | `PROTECTED_ADMIN_PASSWORD`  |
| Driver | `driver@ridego.dev`| `PROTECTED_DRIVER_PASSWORD` |

**Passengers are never seeded.** Every passenger creates their own account from `/register` —
there is no shared passenger login anywhere in the app.

* Each protected role has its **own unique password** — nothing is shared and nothing is
  hard-coded in the UI.
* Passwords are bcrypt-hashed (12 rounds) and the plaintext lives only in `backend/.env`. Leave a
  password blank to have a cryptographically random one generated when the account is first
  created (it is printed once in the server log).
* These accounts are **immutable**: `isProtected` users can never be blocked, rejected, suspended
  or re-roled from the admin console, and a deleted account is re-created (and un-blocked) on the
  next boot. Ordinary passenger accounts are unaffected.
* Changing `PROTECTED_<ROLE>_PASSWORD` rotates the credential — the stored hash is re-synced on
  the next boot.

Configure them in `backend/.env` (template in `backend/.env.example`):

```env
PROTECTED_ADMIN_EMAIL=admin@ridego.dev
PROTECTED_ADMIN_PASSWORD=<unique admin password>
PROTECTED_DRIVER_EMAIL=driver@ridego.dev
PROTECTED_DRIVER_PASSWORD=<unique driver password>
```

Self-registration at `/register` covers passengers and drivers; admin accounts can only be
provisioned through this config.
**Promo codes:** `RIDE20` (20% off), `WELCOME5` ($5 off)

---

## 🧭 API Overview

All endpoints are prefixed with `/api`. Auth-protected endpoints require `Authorization: Bearer <token>`.

| Area | Base path | Includes |
|------|-----------|----------|
| Auth | `/api/auth` | register, login, me, logout |
| Rides | `/api/rides` | estimate, book, active, history, accept/reject, status, cancel, rate, emergency, auto-dispatch |
| Drivers | `/api/driver` | profile, status, location, vehicles, earnings, ratings |
| Payments | `/api/payments` | Stripe config/intents, pay, wallet top-up |
| Promos | `/api/promos` | validate coupon |
| Support | `/api/support` | tickets, notifications |
| Admin | `/api/admin` | stats, users, drivers, rides, payments, promos, tickets, analytics |
| AI | `/api/ai` | copilot, predict-fare, safety-scan, driver-hotspots |
| Health | `/api/health` | server health check |

### Real-time events (Socket.io)

- Live ride status updates (SEARCHING → DRIVER_ASSIGNED → TRIP_STARTED → TRIP_COMPLETED → PAYMENT_COMPLETED)
- Driver location streaming during active trips
- Notifications (new ride requests, updates)

---

## 🧪 Smoke Test

With the API running, validate core flows end-to-end:

```bash
node backend/scripts/smoke.js
```

It exercises login for all roles, fare estimation, promo validation, a full passenger→driver ride flow, and admin listing endpoints.

---

## 📜 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend together (`concurrently`) |
| `npm run dev:memory --prefix backend` | Backend with in-memory MongoDB auto-seed |
| `npm run server` / `npm run client` | Run a single side |
| `npm run seed` | Seed protected accounts + sample data into a persistent DB |
| `npm run build` | Production build of the frontend |
| `npm start` | Start the backend API in production mode |

---

## 🔒 Security & Notes

- JWT-based authentication with `bcryptjs` password hashing
- Admin routes guarded by role-based middleware
- Server-enforced fare validation (prevents client-side price tampering / double charges)
- Stale-ride watchdog auto-cancels abandoned live rides
- Upload middleware restricts file types for vehicle images
- `.env` files, `node_modules`, build output, logs, and local Mongo data are gitignored

---

## 📄 License

Private project — all rights reserved.