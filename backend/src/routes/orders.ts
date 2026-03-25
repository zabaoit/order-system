import { OrderStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  const schema = z.object({ userId: z.string(), idempotencyKey: z.string().min(8).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { userId, idempotencyKey } = parsed.data;

  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } });
    if (existing) return res.json(existing);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: 'OPEN' },
        include: { items: { include: { product: true } } },
      });
      if (!cart || cart.items.length === 0) throw new Error('Cart is empty');

      const productIds = cart.items.map((i) => i.productId);
      await tx.$executeRaw`
        SELECT id FROM "Product"
        WHERE id IN (${Prisma.join(productIds)})
        FOR UPDATE
      `;

      const fresh = await tx.product.findMany({ where: { id: { in: productIds } } });
      const map = new Map(fresh.map((p) => [p.id.toString(), p]));

      let total = 0;
      for (const item of cart.items) {
        const p = map.get(item.productId.toString());
        if (!p) throw new Error(`Product ${item.productId} not found`);
        if (p.stock < item.quantity) throw new Error(`Insufficient stock for ${p.sku}`);
      }

      for (const item of cart.items) {
        const p = map.get(item.productId.toString())!;
        total += Number(p.price) * item.quantity;
        await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: item.quantity } } });
      }

      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          userId,
          status: OrderStatus.PENDING,
          totalAmount: total,
          idempotencyKey: idempotencyKey ?? null,
          items: {
            create: cart.items.map((item) => {
              const p = map.get(item.productId.toString())!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                priceAtOrder: p.price,
              };
            }),
          },
        },
        include: { items: true },
      });

      await tx.cart.update({ where: { id: cart.id }, data: { status: 'CHECKED_OUT' } });
      return order;
    });

    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Order creation failed' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const id = BigInt(req.params.id);
  const schema = z.object({ status: z.nativeEnum(OrderStatus) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (parsed.data.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      await tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
    });
    return res.json({ ok: true, status: OrderStatus.CANCELLED });
  }

  const updated = await prisma.order.update({ where: { id }, data: { status: parsed.data.status } });
  return res.json(updated);
});

router.get('/', async (_req, res) => {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: true } });
  res.json(rows);
});

export default router;
