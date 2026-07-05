# Youth Chat Web

Production-oriented full-stack starter for a youth-centric, real-time chatting platform with a 60-second free chat window and credit-based unlock.

## Stack

- Frontend: Next.js App Router, Tailwind CSS, Zustand, Socket.io client
- Backend: Node.js, Express, Socket.io, MongoDB/Mongoose
- Auth: JWT-backed mock Google/phone auth routes ready to swap with real providers
- Monetization: server-authoritative room timer, wallet credits, transaction ledger, secure mocked rewarded-ad callback

## Run Locally

```bash
cd youth-chat-web
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:4000`.

## Core Rules

- Every chat room gets 60 free seconds from `freeWindowStartedAt`.
- Backend computes remaining time from server time, never trusting the browser timer.
- When the room expires, backend emits `room_lock` and rejects `send_message`.
- Male users can spend 10 credits to unlock a locked room.
- Rewarded ad credits are granted only through a signed server route.
