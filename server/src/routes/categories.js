const express = require('express');
const router  = express.Router();
const pool    = require('../lib/db');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
