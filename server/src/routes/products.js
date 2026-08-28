const express = require('express');
const router  = express.Router();
const pool    = require('../lib/db');

// GET /api/products  — filtered product listing
router.get('/', async (req, res, next) => {
  try {
    const { category_id, gender, min_price, max_price, search, sort } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (category_id)              { conditions.push(`p.category_id = $${idx++}`); params.push(category_id); }
    if (gender && gender !== 'all') { conditions.push(`p.gender = $${idx++}`);      params.push(gender); }
    if (min_price)                { conditions.push(`p.price >= $${idx++}`);       params.push(Number(min_price)); }
    if (max_price)                { conditions.push(`p.price <= $${idx++}`);       params.push(Number(max_price)); }
    if (search)                   { conditions.push(`p.title ILIKE $${idx++}`);    params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc')  orderBy = 'p.price ASC';
    if (sort === 'price_desc') orderBy = 'p.price DESC';
    if (sort === 'name_asc')   orderBy = 'p.title ASC';

    const sql = `
      SELECT p.*,
             json_build_object('id', c.id, 'name', c.name) AS categories
      FROM   products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY ${orderBy}
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/products/:id  — single product with gallery + related
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_build_object('id', c.id, 'name', c.name) AS categories,
              COALESCE(
                json_agg(
                  json_build_object('id', pi.id, 'image_url', pi.image_url, 'sort_order', pi.sort_order)
                  ORDER BY pi.sort_order
                ) FILTER (WHERE pi.id IS NOT NULL),
                '[]'::json
              ) AS gallery
       FROM   products p
       LEFT JOIN categories  c  ON c.id  = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE  p.id = $1
       GROUP BY p.id, c.id`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/products/:id/related  — same category, exclude self, limit 4
router.get('/:id/related', async (req, res, next) => {
  try {
    const { rows: [product] } = await pool.query(
      'SELECT category_id FROM products WHERE id = $1', [req.params.id]
    );
    if (!product) return res.json([]);

    const { rows } = await pool.query(
      `SELECT p.*, json_build_object('id', c.id, 'name', c.name) AS categories
       FROM   products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE  p.category_id = $1 AND p.id != $2
       ORDER BY p.created_at DESC
       LIMIT 4`,
      [product.category_id, req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
