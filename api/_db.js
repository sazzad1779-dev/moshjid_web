import pg from 'pg'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Vercel can create a separate pool in each warm function instance.
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    })
    pool.on('error', error => {
      console.error('Idle database connection error:', error.code || error.name)
    })
  }
  return pool
}
