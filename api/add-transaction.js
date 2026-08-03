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
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifyAuth(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }

  const { date, type, category, description, amount, paymentMethod, enteredBy, notes } = req.body || {}

  if (!date || !type || !category || !description || !amount || !enteredBy) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const parsedAmount = parseFloat(String(amount).replace(/,/g, ''))
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount' })
    return
  }

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `INSERT INTO transactions (date, type, category, amount, note, entered_by, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [date, type, category, parsedAmount, `${description}${notes ? ' | ' + notes : ''}`, enteredBy, paymentMethod || 'Cash']
    )
    res.status(201).json({ success: true, id: rows[0].id })
  } catch (err) {
    console.error('Add transaction error:', err)
    res.status(500).json({ error: err.message })
  }
}
