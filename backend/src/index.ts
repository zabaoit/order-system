import cors from 'cors';
import express from 'express';
import { prisma } from './db.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/carts.js';
import orderRoutes from './routes/orders.js';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const port = Number(process.env.PORT || 8082);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/products', productRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

(async () => {
  await prisma.$connect();
  app.listen(port, () => console.log(`Order backend running at http://localhost:${port}`));
})();
