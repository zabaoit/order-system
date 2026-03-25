# E-commerce Order System (Backend MVP)

## Features
- Product + inventory management
- Add products to cart
- Create order from cart with DB transaction
- Update order status (including cancel + restock)
- Idempotency key on create order

## Run
```bash
docker compose up -d
cd backend
npm install
cp .env.example .env
npm run prisma:push
npm run dev
```

Backend: `http://localhost:8082`

## Main APIs
- `POST /api/products`
- `GET /api/products`
- `PATCH /api/products/:id/stock`
- `POST /api/carts/:userId/items`
- `GET /api/carts/:userId`
- `POST /api/orders` `{ userId, idempotencyKey? }`
- `PATCH /api/orders/:id/status`
- `GET /api/orders`

## Transaction integrity
When creating order:
1. Lock product rows (`FOR UPDATE`)
2. Re-check stock inside transaction
3. Decrement stock + create order + order items atomically
4. Mark cart as checked out
