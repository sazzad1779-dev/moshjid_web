import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { getEnumValues } from './_enum-values.js'
import { getSecret, applyCors, readSessionToken } from './_security.js'

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

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  try {
    const pool = getPool()
    const enums = await getEnumValues(pool, [
      'payment_method',
      'transaction_status',
      'user_role',
      'user_status',
      'due_status',
      'approval_status',
    ])

    const categoriesResult = await pool.query(
      `SELECT name, type::text AS type
         FROM transaction_categories
        WHERE is_active = true
        ORDER BY type, name`
    )

    let areas = []
    let areasError = ''
    try {
      const areasResult = await pool.query('SELECT id::text AS id, name FROM areas ORDER BY name')
      areas = areasResult.rows
    } catch (error) {
      console.error('Area options error:', error)
      areasError = 'Could not load area options.'
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      transactionTypes: [...new Set(categoriesResult.rows.map(category => category.type))],
      paymentMethods: enums.payment_method,
      transactionStatuses: enums.transaction_status,
      userRoles: enums.user_role,
      userStatuses: enums.user_status,
      dueStatuses: enums.due_status,
      approvalStatuses: enums.approval_status,
      transactionCategories: categoriesResult.rows,
      areas,
      areasError,
    })
  } catch (error) {
    console.error('Options error:', error)
    res.status(500).json({ error: 'Failed to load options.' })
  }
}
