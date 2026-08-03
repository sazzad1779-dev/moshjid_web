import { getPool } from './_db.js'

// Format in the server's local calendar so dates don't shift across UTC midnight
function fmtDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT t.id, t.date, t.type, t.category, t.amount, t.note,
              t.payment_method, t.status, t.receipt_number,
              p.full_name AS entered_by
       FROM transactions t
       LEFT JOIN profiles p ON p.id = t.entered_by
       ORDER BY t.date ASC, t.id ASC`
    )

    const mapped = rows.map(r => ({
      id: r.id,
      date: fmtDate(r.date),
      type: r.type,
      category: r.category || 'Uncategorized',
      amount: parseFloat(r.amount) || 0,
      note: r.note || '',
      enteredBy: r.entered_by || '',
      paymentMethod: r.payment_method || 'cash',
      status: r.status || 'pending',
      receiptNumber: r.receipt_number || '',
    })).filter(r => r.amount > 0)

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.status(200).json({ rows: mapped, count: mapped.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message })
  }
}
