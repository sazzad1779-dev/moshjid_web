import { getPool } from './_db.js'
import { applyCors, verifySession } from './_security.js'
import { isPrayerTime, PRAYER_FIELDS } from '../src/utils/prayerSchedule.js'

const MOSQUE_NAME = 'Madhya Beparipara Mohammadia Jame Masjid'

async function savePrayerTimes(pool, times) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serialize initialization when two admins publish the first schedule.
    await client.query('LOCK TABLE settings IN SHARE ROW EXCLUSIVE MODE')
    const values = [JSON.stringify(times)]
    const { rowCount } = await client.query(
      `UPDATE settings
       SET prayer_times = $1, updated_at = NOW()
       WHERE id = (SELECT id FROM settings ORDER BY id LIMIT 1)`,
      values
    )
    if (rowCount === 0) {
      // Both the UUID and boolean schemas provide a default settings ID.
      await client.query(
        'INSERT INTO settings (prayer_times, mosque_name) VALUES ($1, $2)',
        [...values, MOSQUE_NAME]
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export default async function handler(req, res) {
  applyCors(res, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  let times
  if (req.method === 'PATCH') {
    const session = await verifySession(req)
    if (!session) return res.status(401).json({ error: 'Unauthorized.' })
    if (!['admin', 'super_admin'].includes(session.role)) {
      return res.status(403).json({ error: 'Forbidden.' })
    }
    if (!PRAYER_FIELDS.every(({ key }) => isPrayerTime(req.body?.times?.[key]))) {
      return res.status(400).json({ error: 'Enter a valid time for all six prayers.' })
    }
    times = Object.fromEntries(PRAYER_FIELDS.map(({ key }) => [key, req.body.times[key]]))
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'Prayer schedule database is unavailable.' })
    }
    const pool = getPool()
    if (req.method === 'PATCH') {
      await savePrayerTimes(pool, times)
      return res.status(200).json({ times })
    }

    const { rows } = await pool.query('SELECT prayer_times FROM settings ORDER BY id LIMIT 1')
    return res.status(200).json({ times: rows[0]?.prayer_times ?? null })
  } catch (error) {
    if (error.code === '42703' || error.code === '42P01') {
      if (req.method === 'GET') return res.status(200).json({ times: null })
      return res.status(503).json({ error: 'Apply the prayer_times schema update in Supabase before publishing.' })
    }
    console.error('Prayer times API error:', error)
    return res.status(500).json({ error: 'Could not complete the prayer schedule request.' })
  }
}
