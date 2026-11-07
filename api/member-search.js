import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { applyCors, getSecret, readSessionToken } from './_security.js'

async function verifySession(req) {
  const secret = getSecret()
  const token = readSessionToken(req)
  if (!secret || !token) return null
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

  const session = await verifySession(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }
  if (!['admin', 'super_admin', 'collector'].includes(session.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  const query = (new URL(req.url, 'http://localhost').searchParams.get('q') || '').trim()
  if (query.length < 2) {
    res.status(200).json({ rows: [] })
    return
  }
  if (query.length > 100) {
    res.status(400).json({ error: 'Search text is too long' })
    return
  }

  try {
    const escapedQuery = query.replace(/[\\%_]/g, '\\$&')
    const { rows } = await getPool().query(
      `SELECT id::text AS id, full_name AS "fullName", member_code AS "memberCode"
         FROM profiles
        WHERE role::text = 'member'
          AND status::text = 'active'
          AND is_deleted = false
          AND full_name ILIKE $1 ESCAPE '\\'
        ORDER BY full_name, id
        LIMIT 8`,
      [`%${escapedQuery}%`]
    )
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ rows })
  } catch (error) {
    console.error('Member search error:', error)
    res.status(500).json({ error: 'Failed to search members.' })
  }
}
