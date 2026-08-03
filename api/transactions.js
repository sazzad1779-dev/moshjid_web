import { getPool } from './_db.js'

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT id, date, type, category, amount, note, entered_by
       FROM transactions
       ORDER BY date ASC, id ASC`
    )

    const mapped = rows.map(r => ({
      id: r.id,
      date: r.date instanceof Date
        ? r.date.toISOString().split('T')[0]
        : String(r.date),
      type: r.type,
      category: r.category || 'Uncategorized',
      amount: parseFloat(r.amount) || 0,
      note: r.note || '',
      enteredBy: r.entered_by || '',
    })).filter(r => r.amount > 0)

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.status(200).json({ rows: mapped, count: mapped.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message })
  }
}
