import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { getSecret, applyCors, readSessionToken } from './_security.js'

// Format in the server's local calendar so dates don't shift across UTC midnight
function fmtDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

async function verifyAuth(req) {
  const secret = getSecret()
  if (!secret) return null
  const token = readSessionToken(req)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { clockTolerance: 60 })
    return payload
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  applyCors(res, req)

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifyAuth(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }
  if (!['admin', 'collector'].includes(session.role)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    const pool = getPool()

    // A collector must only ever see their own data. The PIN login JWT carries
    // the collector's name (set from COLLECTOR_PIN_NAMES / COLLECTOR_DEFAULT_NAME
    // in auth.js), so scope the query to that person's profile.
    const params = []
    let scopeClause = ''
    if (session.role === 'collector') {
      params.push(session.name || 'Collector')
      scopeClause = `AND p.full_name = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT p.full_name AS name, tc.type AS type, tc.name AS category, t.amount, t.description AS note, t.date, t.entered_by, t.created_at
       FROM transactions t
       LEFT JOIN profiles p ON p.id = t.entered_by
       LEFT JOIN transaction_categories tc ON tc.id = t.category_id
       WHERE t.is_deleted = false AND t.amount > 0
         ${scopeClause}
       ORDER BY t.date DESC, t.created_at DESC`,
      params
    )

    const byCollector = {}
    rows.forEach(r => {
      const name = r.name || 'Unknown'
      if (!byCollector[name]) {
        byCollector[name] = { name, income: 0, expense: 0, count: 0, transactions: [] }
      }
      const c = byCollector[name]
      const amount = parseFloat(r.amount) || 0
      const type = r.type || 'other'
      if (type === 'expense') c.expense += amount
      else if (type === 'income') c.income += amount
      c.count += 1
      c.transactions.push({
        date: fmtDate(r.date),
        category: r.category || 'Uncategorized',
        amount,
        note: r.note || '',
      })
    })

    const collectors = Object.values(byCollector).sort((a, b) => b.income - a.income)

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      collectors,
      totalRows: rows.length,
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Collector API Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
