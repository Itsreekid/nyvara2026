require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const productsRouter  = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const ordersRouter    = require('./routes/orders');
const errorHandler    = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.options('*', cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'nyvara-api' }));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/products',   productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders',     ordersRouter);

// ─── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅  Nyvara API running on http://localhost:${PORT}`);
});
