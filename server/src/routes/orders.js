const express = require('express');
const router  = express.Router();
const pool    = require('../lib/db');

// POST /api/orders  — create order + order_items in one transaction
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_name, customer_email, phone, city, postal_code, country, items } = req.body;

    if (!customer_name || !customer_email || !phone || !city || !country ||
        !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'customer_name, customer_email, phone, city, country and items are required.',
      });
    }

    await client.query('BEGIN');

    // 1. Fetch authoritative prices from DB (never trust client-side prices)
    const productIds = items.map(i => i.product_id);
    const { rows: products } = await client.query(
      'SELECT id, price FROM products WHERE id = ANY($1::uuid[])',
      [productIds]
    );

    const priceMap   = Object.fromEntries(products.map(p => [p.id, Number(p.price ?? 0)]));
    const total_price = items.reduce(
      (sum, i) => sum + (priceMap[i.product_id] ?? 0) * i.quantity, 0
    );

    // 2. Insert order
    const { rows: [order] } = await client.query(
      `INSERT INTO orders
         (customer_name, customer_email, phone, city, postal_code, country, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [customer_name, customer_email, phone, city, postal_code ?? null, country, total_price]
    );

    // 3. Insert order items (bulk)
    const itemValues = items
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(', ');
    const itemParams = items.flatMap(i => [order.id, i.product_id, i.quantity]);

    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity) VALUES ${itemValues}`,
      itemParams
    );

    await client.query('COMMIT');

    res.status(201).json({ order, total_price });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders/:id  — order with items + product details
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [order] } = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { rows: orderItems } = await pool.query(
      `SELECT oi.*, row_to_json(p) AS product
       FROM   order_items oi
       JOIN   products p ON p.id = oi.product_id
       WHERE  oi.order_id = $1`,
      [req.params.id]
    );

    res.json({ ...order, order_items: orderItems });
  } catch (err) { next(err); }
});

// GET /api/orders  — all orders (admin)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
