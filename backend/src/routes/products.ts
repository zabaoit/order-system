import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

router.post('/', async (req, res) => {
  const schema = z.object({ sku: z.string(), name: z.string(), price: z.number().positive(), stock: z.number().int().min(0) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const created = await prisma.product.create({ data: parsed.data });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
    return res.status(500).json({ error: 'Create product failed' });
  }
});

router.patch('/:id/stock', async (req, res) => {
  const id = BigInt(req.params.id);
  const schema = z.object({ stock: z.number().int().min(0) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const updated = await prisma.product.update({ where: { id }, data: { stock: parsed.data.stock } });
  res.json(updated);
});

export default router;
