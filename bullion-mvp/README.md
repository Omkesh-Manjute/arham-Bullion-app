# Bullion Live Rate & Local Trading Platform (MVP)

**PRD Implementation**  
**Date:** 2026-07-01  
**Status:** Phase 1 - Localhost MVP (Backend + Admin + Mobile scaffolds ready)

## Objective

A full-stack MVP consisting of:
- Mobile App (React Native + Expo)
- Admin Panel (React + MUI)
- Backend (Node.js + Express + Socket.IO)

**Key Features:**
- Live MCX Gold & Silver prices from Alice Blue WebSocket (simulated in MVP)
- Margin, Spread, Premium, GST applied to create Buy/Sell rates
- BUY/SELL orders saved only in local DB (no real exchange orders)
- Admin manages margins, overrides prices, approves/completes orders
- Real-time updates via Socket.IO

Alice Blue is **only** used for live market data. No order placement.

## Project Structure

```
bullion-mvp/
├── backend/               # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── aliceblue.service.js
│   │   ├── sockets/
│   │   └── utils/
│   ├── package.json
│   └── server.js
├── mobile/                # React Native + Expo
│   ├── App.js
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   └── services/
│   └── package.json
├── admin/                 # React Admin Panel
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── src/App.js
├── docs/
│   └── PRD.md
└── README.md
```

## Tech Stack (Implemented)

| Module       | Technology                     |
|--------------|--------------------------------|
| Backend      | Node.js + Express + Socket.IO  |
| Database     | SQLite (MVP) / PostgreSQL ready |
| Live Updates | Socket.IO                      |
| Mobile       | React Native + Expo            |
| Admin        | React 18 + MUI + Vite          |
| Live Feed    | Simulated Alice Blue WS        |

## Setup Instructions

### 1. Backend
```bash
cd backend
npm install
npm run dev
```
- Runs on `http://localhost:5000`
- Socket.IO on same port

### 2. Mobile App
```bash
cd mobile
npm install
npx expo start
```
- Expo dev server on `localhost:8081`

### 3. Admin Panel
```bash
cd admin
npm install
npm run dev
```
- Runs on `http://localhost:5173`

## Current Status (MVP Progress)

- ✅ Backend scaffolding complete (Express + Socket.IO + In-memory DB)
- ✅ Live price engine with margin application
- ✅ Customer auth (mock OTP + PIN)
- ✅ Order management (local)
- ✅ Admin Panel: Live rates, override margins, orders
- ✅ Mobile App skeleton: Login, Dashboard, Buy/Sell screens
- 🚧 Alice Blue real WS integration (stubbed with simulator)
- 🚧 Full PostgreSQL migration (ready for Prisma)
- ⏳ Charts & Notifications (Phase 2)

## Live Price Flow (Implemented)

```
Simulated Alice Blue WS → Price Engine → Apply Margin/Spread/Premium/GST → Final Buy/Sell Rates → Socket.IO → Mobile + Admin
```

## Database Schema (Implemented)

### Users
- id, name, mobile, balance, pin, role

### Orders
- id, userId, commodity, buy_sell, qty, price, status, createdAt

### Rates Config
- gold_mcx, silver_mcx, gold_margin, silver_margin, spread, premium, gst

## API Endpoints

### Auth
- POST `/api/auth/login` (mock OTP)
- POST `/api/auth/verify-otp`
- POST `/api/auth/pin-login`

### Rates
- GET `/api/rates/live`
- POST `/api/rates/override` (admin)

### Orders
- POST `/api/orders/buy`
- POST `/api/orders/sell`
- GET `/api/orders/history`

### Admin
- GET `/api/admin/dashboard`
- GET `/api/admin/orders`
- PUT `/api/admin/orders/:id`

## Future Phases Roadmap

- **Phase 2**: Charts (TradingView), Price Alerts, Auto Signals
- **Phase 3**: Multi-dealer, White-label, Real Alice Blue auth

## How to Run Full Demo

1. Start backend
2. Start admin panel
3. Start mobile (Expo)
4. In admin: Adjust margins
5. In mobile: Login (use any mobile), Buy/Sell

---

**Note:** This is a localhost MVP. Real Alice Blue credentials and production DB will be added in Phase 2.

**Ready to proceed?** Let me know if you want me to:
- Expand backend features
- Implement real Alice Blue WS
- Polish specific screens
- Add PostgreSQL + Prisma
