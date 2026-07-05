# Architecture

## Database Schema

### Users

- `authProvider`: `google | phone | mock`
- `providerId`: external auth subject
- `phone`, `email`
- `name`, `age`, `gender`
- `lookingFor`: preferred genders
- `bio`, `interests`, `profilePictures`
- `isFemaleVerified`: verification flag for female profiles
- `credits`: integer wallet balance
- `isOnline`, `lastSeenAt`

### Rooms

- `participants`: two user ids
- `maleUser`, `femaleUser`
- `sharedInterests`
- `status`: `active | locked | closed`
- `freeWindowStartedAt`: server timestamp
- `freeWindowSeconds`: defaults to `60`
- `unlockedAt`, `unlockedByTransaction`
- `lastMessageAt`

### Messages

- `room`
- `sender`
- `body`
- `deliveredAt`
- `readBy`

### Wallet Transactions

- `user`, optional `room`
- `type`: `signup_bonus | ad_reward | room_unlock | purchase`
- `direction`: `credit | debit`
- `amount`
- `balanceAfter`
- `provider`, `externalRef`, `metadata`

## Backend APIs

- `POST /api/auth/login`: mock Google/phone-ready login and profile upsert
- `GET /api/auth/me`: current profile
- `POST /api/match/find`: queue or create a matched room
- `DELETE /api/match/queue`: leave queue
- `GET /api/rooms/:roomId`: room metadata, messages, server timer
- `POST /api/rooms/:roomId/unlock`: spend 10 credits and restart 60-second window
- `POST /api/wallet/ad-session`: create signed rewarded-ad event payload
- `POST /api/wallet/earn-credits`: grant 20 credits after valid signed ad event
- `POST /api/wallet/purchase`: mock premium credit package purchase

## Socket.io Events

Client emits:

- `join_room`
- `send_message`
- `typing`

Server emits:

- `message:new`
- `timer_update`
- `room_lock`
- `presence_update`
- `typing`

## Timer and Paywall

The browser timer is only a display. The backend calculates remaining time from `freeWindowStartedAt` and `freeWindowSeconds`. The server checks rooms every second and locks expired active rooms. `send_message` also checks expiry before accepting a message, so refreshing or modifying the browser cannot bypass the lock.

## Production Hardening Notes

- Replace mock auth with Google OAuth and phone OTP provider verification.
- Replace mock purchase route with Stripe/Razorpay webhook-confirmed credit grants.
- Replace mock rewarded-ad route with ad network server-to-server callback verification.
- Add Redis for distributed matchmaking queue and Socket.io adapter in multi-node deployments.
- Add moderation, report/block flows, rate limits, and abuse detection before launch.
