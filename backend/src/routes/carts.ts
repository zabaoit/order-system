import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();

router.post('/:userId/items', async (req, res) => {
  const { userId } = req.params;
  const schema = z.object({ productId: z.coerce.bigint(), quantity: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const open = await prisma.cart.findFirst({ where: { userId, status: 'OPEN' } });
  const cart = open ?? await prisma.cart.create({ data: { userId, status: 'OPEN' } });

  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: parsed.data.productId } } });
  const item = existing
    ? await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId: parsed.data.productId } }, data: { quantity: existing.quantity + parsed.data.quantity } })
    : await prisma.cartItem.create({ data: { cartId: cart.id, productId: parsed.data.productId, quantity: parsed.data.quantity } });

  res.json(item);
});

router.get('/:userId', async (req, res) => {
  const cart = await prisma.cart.findFirst({
    where: { userId: req.params.userId, status: 'OPEN' },
    include: { items: { include: { product: true } } },
  });
  res.json(cart);
});

export default router;
