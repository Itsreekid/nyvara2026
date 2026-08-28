const { Pool } = require('pg');

/**
 * PostgreSQL connection pool.
 * Set DATABASE_URL in your Coolify environment variables:
 *   postgresql://user:password@host:5432/dbname
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL if your Coolify Postgres requires it
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
