import { createHash } from 'node:crypto'
import { getPool } from '../_db.js'
import { getEnumValues } from '../_enum-values.js'
import { mobileSession } from '../_security.js'
import { submitTransaction } from '../add-transaction.js'
import adminData from '../admin-data.js'
import prayerTimes from '../prayer-times.js'

const STAFF = ['collector', 'admin', 'super_admin']
const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

async function supabaseAuth(path, options = {}) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Mobile authentication is missing its Supabase configuration')
  return fetch(new URL('/auth/v1/' + path, url), {
    ...options,
    signal: AbortSignal.timeout(10000),
    headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
  })
}

async function profile(id, db = getPool()) {
  if (!UUID.test(id || '')) return null
  const { rows: [row] } = await db.query(
    `SELECT id, full_name AS name, role::text AS role FROM profiles
       WHERE id = $1 AND status::text = 'active' AND is_deleted = false`, [id]
  )
  return STAFF.includes(row?.role) ? row : null
}

async function session(req, res) {
  const { email, password, refreshToken } = req.body || {}
  const refresh = typeof refreshToken === 'string' && refreshToken.length > 0
  if (!refresh && (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password)) {
    return res.status(400).json({ error: 'Enter your staff email and password.' })
  }
  const response = await supabaseAuth('token?grant_type=' + (refresh ? 'refresh_token' : 'password'), {
    method: 'POST',
    body: JSON.stringify(refresh ? { refresh_token: refreshToken } : { email: email.trim(), password }),
  })
  if (response.status === 429) return res.status(429).json({ error: 'Too many attempts. Try again later.' })
  if ([400, 401, 403].includes(response.status)) {
    return res.status(401).json({ error: refresh ? 'Sign in again to resume syncing.' : 'Email or password is incorrect.' })
  }
  if (!response.ok) throw new Error('Supabase session request failed: ' + response.status)
  const { access_token, refresh_token, user } = await response.json()
  const account = await profile(user?.id)
  if (!account) return res.status(403).json({ error: 'This account has no active staff profile.' })
  return res.status(200).json({ account, accessToken: access_token, refreshToken: refresh_token })
}

async function authenticate(req, res) {
  const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) {
    res.status(401).json({ error: 'Sign in to sync.' })
    return null
  }
  const response = await supabaseAuth('user', { headers: { Authorization: 'Bearer ' + token } })
  if ([400, 401, 403].includes(response.status)) {
    res.status(401).json({ error: 'Session expired.' })
    return null
  }
  if (!response.ok) throw new Error('Supabase user lookup failed: ' + response.status)
  const account = await profile((await response.json()).id)
  if (!account) {
    res.status(403).json({ error: 'Your staff access has changed. Sign in again.' })
    return null
  }
  return account
}

async function snapshot(req, res, account) {
  const client = await getPool().connect()
  let copy
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    if (account) {
      const current = await profile(account.id, client)
      if (!current) {
        await client.query('ROLLBACK')
        return res.status(403).json({ error: 'Your staff access has changed. Sign in again.' })
      }
      account = current
    }
    const { rows: publicTransactions } = await client.query(
      `SELECT t.id::text, t.date::text, tc.type::text, tc.name AS category, t.amount::text
         FROM transactions t LEFT JOIN transaction_categories tc ON tc.id = t.category_id
        WHERE t.is_deleted = false AND t.amount > 0
        ORDER BY t.date DESC, t.id`
    )
    const { rows: [settings] } = await client.query(
      "SELECT to_jsonb(settings)->'prayer_times' AS prayers FROM settings ORDER BY id LIMIT 1"
    )
    copy = { publicTransactions, prayers: settings?.prayers ?? null }
    if (account) {
      const collector = account.role === 'collector' ? account.id : null
      const { rows: transactions } = await client.query(
        `SELECT t.id::text, t.date::text, tc.type::text, tc.name AS category, t.amount::text,
                t.receipt_number AS "receiptNumber", t.description AS note, t.status::text,
                t.payment_method::text AS "paymentMethod", t.member_id::text AS "memberId",
                t.donor_name AS "donorName", actor.full_name AS "collectorName", allocation.months AS "dueMonths", allocation.year AS "dueYear"
           FROM transactions t LEFT JOIN transaction_categories tc ON tc.id = t.category_id
           LEFT JOIN profiles actor ON actor.id = COALESCE(t.collector_id, t.entered_by)
           LEFT JOIN LATERAL (
             SELECT array_agg(EXTRACT(MONTH FROM d.period)::int ORDER BY d.period) AS months,
                    EXTRACT(YEAR FROM min(d.period))::int AS year
               FROM monthly_due_payments p JOIN monthly_dues d ON d.id = p.monthly_due_id
              WHERE p.transaction_id = t.id::text
           ) allocation ON true
          WHERE t.is_deleted = false AND ($1::uuid IS NULL OR t.collector_id = $1 OR t.entered_by = $1)
          ORDER BY t.date DESC, t.id`, [collector]
      )
      const { rows: members } = await client.query(
        `SELECT id::text, full_name AS "fullName", member_code AS "memberCode", status::text,
                monthly_amount::text AS "monthlyAmount",
                CASE WHEN $1::uuid IS NULL THEN phone END AS phone,
                CASE WHEN $1::uuid IS NULL THEN email END AS email,
                CASE WHEN $1::uuid IS NULL THEN address END AS address,
                CASE WHEN $1::uuid IS NULL THEN area_id::text END AS "areaId"
           FROM profiles WHERE role::text = 'member' AND is_deleted = false
            AND ($1::uuid IS NULL OR (collector_id = $1 AND status::text = 'active'))
          ORDER BY full_name, id`, [collector]
      )
      const { rows: dues } = await client.query(
        `SELECT d.id::text, d.member_id::text AS "memberId", d.period::text, d.status::text,
                d.amount_due::text AS "amountDue", d.amount_paid::text AS "amountPaid"
           FROM monthly_dues d JOIN profiles p ON p.id = d.member_id
          WHERE p.role::text = 'member' AND p.is_deleted = false
            AND ($1::uuid IS NULL OR (p.collector_id = $1 AND p.status::text = 'active'))
          ORDER BY d.period DESC, d.id`, [collector]
      )
      const { rows: categories } = await client.query(
        'SELECT name, type::text FROM transaction_categories WHERE is_active = true ORDER BY type, name'
      )
      const enums = await getEnumValues(client, ['payment_method'])
      Object.assign(copy, { account, transactions, members, dues, categories, paymentMethods: enums.payment_method })
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const body = JSON.stringify(copy)
  const tag = '"' + createHash('sha256').update(body).digest('hex') + '"'
  res.setHeader('ETag', tag)
  if (req.headers['if-none-match'] === tag) return res.status(304).end()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).send(body)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  const resource = new URL(req.url, 'http://localhost').searchParams.get('resource')
  try {
    if (resource === 'session' && req.method === 'POST') return await session(req, res)
    if (resource === 'snapshot' && req.method === 'GET' && !req.headers.authorization) {
      return await snapshot(req, res, null)
    }
    const account = await authenticate(req, res)
    if (!account) return
    if (resource === 'snapshot' && req.method === 'GET') return await snapshot(req, res, account)
    if (resource === 'transactions' && req.method === 'POST') {
      const { submissionId, ...body } = req.body || {}
      const value = body.date
      const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00Z') : null
      if (!UUID.test(submissionId || '') || typeof body.amount !== 'string'
        || !/^\d{1,10}(\.\d{1,2})?$/.test(body.amount) || Number(body.amount) <= 0
        || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return res.status(400).json({ error: 'Enter a valid submission ID, date and amount.' })
      }
      if (typeof body.type !== 'string' || body.type.length > 100
        || typeof body.category !== 'string' || body.category.length > 100
        || (body.donorName !== undefined && (typeof body.donorName !== 'string' || body.donorName.length > 200))
        || (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000))
        || body.notes !== undefined
        || (body.dueMonths?.length && !(body.type === 'income' && /^imam hadi?ya$/i.test(body.category)))) {
        return res.status(400).json({ error: 'Invalid category, description, member name or due months.' })
      }
      return await submitTransaction({ ...body, enteredBy: account.name }, res, account, submissionId)
    }
    if (account.role === 'collector') return res.status(403).json({ error: 'Admin access required.' })
    req[mobileSession] = account
    if (resource === 'prayer-times') return await prayerTimes(req, res)
    if (resource === 'admin') {
      const url = new URL(req.url, 'http://localhost')
      const target = url.searchParams.get('target')
      url.searchParams.set('resource', target || '')
      req.url = url.pathname + url.search
      return await adminData(req, res)
    }
    return res.status(405).json({ error: 'Unsupported mobile API operation.' })
  } catch (error) {
    console.error('Mobile API error:', error.code || error.name, error.message)
    return res.status(503).json({ error: 'The sync service is temporarily unavailable.' })
  }
}
