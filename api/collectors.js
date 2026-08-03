import { jwtVerify } from 'jose'
import { getPool } from './_db.js'

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || 'change-this-in-production-32-chars!')
const COOKIE_NAME = 'mosque_session'

// Format in the server's local calendar so dates don't shift across UTC midnight
function fmtDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

async function verifyAuth(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const token = match ? match[1] : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 })
    return payload
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifyAuth(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }
  if (!['admin', 'collector'].includes(session.role)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT p.full_name AS name, t.type, t.category, t.amount, t.note, t.date
       FROM transactions t
       LEFT JOIN profiles p ON p.id = t.entered_by
       WHERE t.amount > 0
       ORDER BY t.date DESC, t.created_at DESC`
    )

    const byCollector = {}
    rows.forEach(r => {
      const name = r.name || 'Unknown'
      if (!byCollector[name]) {
        byCollector[name] = { name, income: 0, expense: 0, count: 0, transactions: [] }
      }
      const c = byCollector[name]
      const amount = parseFloat(r.amount) || 0
      if (r.type === 'expense') c.expense += amount
      else c.income += amount
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
