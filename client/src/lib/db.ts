import { Pool } from 'pg';

/**
 * Server-only PostgreSQL connection pool.
 * Used inside Next.js API route handlers (never in 'use client' files).
 *
 * Set in Coolify environment variables (server-side only, NOT NEXT_PUBLIC_):
 *   DATABASE_URL=postgresql://user:password@host:5432/dbname
 */

declare global {
  // Prevent multiple pools during Next.js HMR in development
  // eslint-disable-next-line no-var
  var __nyvara_pg_pool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return pool;
}

const pool: Pool = globalThis.__nyvara_pg_pool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nyvara_pg_pool = pool;
}

export default pool;
