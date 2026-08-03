import { jwtVerify } from 'jose'
import { getPool } from './_db.js'

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || 'change-this-in-production-32-chars!')
const COOKIE_NAME = 'mosque_session'

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
      `SELECT type, category, amount, entered_by
       FROM transactions
       WHERE amount > 0`
    )

    const byCollector = {}
    rows.forEach(r => {
      const name = r.entered_by || 'Unknown'
      if (!byCollector[name]) {
        byCollector[name] = { name, income: 0, expense: 0, count: 0 }
      }
      byCollector[name][r.type] += parseFloat(r.amount) || 0
      byCollector[name].count += 1
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      collectors: Object.values(byCollector),
      totalRows: rows.length,
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Collector API Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
