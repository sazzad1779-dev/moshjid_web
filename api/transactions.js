import { getPool } from './_db.js'
import { applyCors } from './_security.js'

// PUBLIC endpoint — intentionally unauthenticated so the homepage/dashboard can
// show community finances. Because it is public, it must NEVER expose personal
// or operational details: donor names, phone numbers, notes, payment methods,
// statuses, receipt numbers, or who entered the record.
//
// If you need the full, sensitive fields, build a separate authenticated route
// (admin-only) instead of adding fields here.

// Format in the server's local calendar so dates don't shift across UTC midnight
function fmtDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  applyCors(res, req)

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT t.id, t.date, tc.type AS type, tc.name AS category, t.amount, t.description AS note
       FROM transactions t
       LEFT JOIN transaction_categories tc ON tc.id = t.category_id
       WHERE t.is_deleted = false AND t.amount > 0
       ORDER BY t.date ASC, t.id ASC`
    )

    // Public-safe projection: only the fields needed by the public pages.
    const mapped = rows.map(r => ({
      id: r.id || '',
      date: fmtDate(r.date),
      type: r.type || 'other',
      category: r.category || 'Uncategorized',
      amount: parseFloat(r.amount) || 0,
      note: r.note || '',
    }))

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.status(200).json({ rows: mapped, count: mapped.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message })
  }
}
