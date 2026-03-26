# AGENTS.md - Order System Backend

This file defines how coding agents should work in this repository.

## 1) Project Goal
Build a backend-focused E-commerce Order System with strong transaction integrity.

Core scope:
- Product + inventory management
- Cart operations
- Order creation
- Order status updates
- Safe stock handling under concurrent requests

Out of scope (for now):
- Full payment gateway
- Full auth/role system
- Full frontend product UI

## 2) Runbook (must work before coding)

## Infrastructure
```bash
cd D:\Project\order-system
docker compose up -d postgres
```

## Backend
```bash
cd D:\Project\order-system\backend
npm install
copy .env.example .env
npm run prisma:push
npm run dev
```

Health check:
- `GET http://localhost:8082/health`

## 3) Engineering Rules
- Language: TypeScript (strict mode).
- Keep routes thin; put complex business logic in service-style functions/modules.
- Validate all request payloads (Zod).
- Do not trust client-side numbers for stock/order totals.
- Return explicit error messages and HTTP status codes.

## 4) Transaction & Data Integrity Rules (critical)
- Order creation must run in DB transaction.
- Lock product rows before stock mutation (`FOR UPDATE` or equivalent).
- Re-check stock inside transaction before decrement.
- Never allow negative stock.
- Use idempotency key for order creation to avoid duplicate orders.
- On `CANCELLED`, restore stock in one transaction.

## 5) API Conventions
- JSON in/out only.
- Consistent error shape:
```json
{ "error": "message" }
```
- Use bigint-safe serialization for IDs.

## 6) Safety Rules
- Never commit secrets.
- `.env` must stay untracked.
- Use `.env.example` with blank/safe placeholders only.
- Do not run destructive commands without explicit confirmation.

## 7) Workflow Required for Every Change
1. Read current code paths before editing.
2. Implement minimal, focused change.
3. Run relevant checks/tests.
4. Provide concise diff summary.
5. Commit with clear message.
6. Push to current branch.

## 8) Definition of Done
A task is done only when:
- Feature works locally.
- No breaking regression in core APIs.
- README or docs updated if behavior/setup changed.
- Commit + push completed.
