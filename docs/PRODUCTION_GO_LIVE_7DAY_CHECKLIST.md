# Production Go-Live 7-Day Checklist

## Day 1: Secrets & Access
- [ ] Rotate all credentials that may have appeared in source/history:
  - Firebase Admin private key
  - VideoSDK API/secret
  - VietQR `WEBHOOK_SECRET`
  - VietQR `CRON_SECRET`
- [ ] Confirm no real secrets remain in `*.example` files.
- [ ] Remove tracked local secret files from git index:
  - root `.env`
  - root `token.txt`
  - `saigondating-server/.env.production`
- [ ] Run root security preflight:
  - `npm run security:preflight`
- [ ] Restrict infra access:
  - least privilege for deploy users
  - MFA on cloud accounts
  - dedicated production service account

## Day 2: Server Configuration
- [ ] Prepare `saigondating-server/.env.production` with production values.
- [ ] Configure Firebase Auth email verification template:
  - subject/body use production ChappAt copy
  - sender/reply-to are correct
  - `EXPO_PUBLIC_EMAIL_VERIFY_CONTINUE_URL` domain is allowlisted in Firebase Auth
- [ ] Run preflight:
  - `cd saigondating-server`
  - `npm run preflight:prod`
- [ ] Confirm:
  - `NODE_ENV=production`
  - `CORS_ORIGINS` contains only trusted domains
  - `REQUIRE_IDEMPOTENCY_KEY=true`
  - `REQUIRE_FIREBASE_APP_CHECK=true` after the app sends App Check headers
  - payment env vars are non-placeholder
  - VideoSDK token TTL, daily quotas, room rate limits are set

## Day 3: Database & Rules
- [ ] Deploy latest Firestore rules.
- [ ] Deploy latest Storage rules.
- [ ] Enable Firebase App Check enforcement for Firestore/Storage after release builds are registered.
- [ ] Configure Firebase budget alerts and quota alerts before public traffic.
- [ ] Run Firebase emulator/rule tests (allow/deny checks):
  - spoofed message uid blocked
  - non-member group storage access blocked
  - transactions write from client denied

## Day 4: Payment Security Tests
- [ ] VietQR `create-payment`:
  - invalid package id -> rejected
  - request replay with same idempotency key -> same response / no duplicate order
- [ ] VietQR `verify-payment`:
  - wrong amount/description -> rejected
  - replay verify -> no double credit
- [ ] Webhook:
  - missing signature -> rejected
  - stale timestamp -> rejected
  - replay event -> ignored (idempotent)

## Day 5: Reliability & Observability
- [ ] Add/verify dashboard alerts:
  - 5xx spikes
  - 401/403/429 spikes
  - payment failure rate
- [ ] Ensure request logs include:
  - `uid` (when authenticated)
  - `orderId` (payment routes)
  - route + status code + latency
- [ ] Confirm backup/retention for payment-related collections.

## Day 6: Staging Rehearsal
- [ ] Deploy to staging with production-like config.
- [ ] Execute full E2E flows:
  - signup/login
  - chat + gifts
  - VietQR payment + balance update
  - order status + webhook callback
- [ ] Verify mobile release build can talk to staging APIs cleanly.

## Day 7: Launch Day
- [ ] Freeze new features (bugfix only).
- [ ] Deploy backend, then mobile/web release.
- [ ] Run smoke tests (top 10 critical user flows).
- [ ] Monitor for first 2-4 hours continuously.
- [ ] Keep rollback ready:
  - previous backend version
  - feature flags for payment if needed

## Post Launch (First 72 hours)
- [ ] Daily payment reconciliation:
  - `orders` vs `wallet.transactions`
- [ ] Review suspicious events:
  - repeated webhook failures
  - repeated duplicate requests
- [ ] Rotate temporary credentials used during launch.
