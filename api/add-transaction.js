import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { getEnumValues } from './_enum-values.js'
import { getSecret, applyCors, readSessionToken } from './_security.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Form display labels → cloud `payment_method` enum values
const PAYMENT_METHOD_MAP = {
  'Cash (নগদ)': 'cash',
  'Bank Transfer (ব্যাংক ট্রান্সফার)': 'bank',
  'bKash (বিকাশ)': 'bkash',
  'Nagad (নগদ)': 'nagad',
  'Rocket (রকেট)': 'other',
  'Check (চেক)': 'bank',
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

// ── Profile resolution ─────────────────────────────────────
// Cloud schema stores entered_by / collector_id as uuid FKs to profiles(id),
// and profiles.id REFERENCES auth.users(id). So a collector must exist as a
// real Supabase Auth user. We create one lazily (PIN login is unchanged).

function slugify(name) {
  const s = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'collector'
}

function authEmailFor(name) {
  const slug = slugify(name)
  const local = slug && slug !== 'collector' ? slug : `member-${crypto.randomUUID()}`
  return `${local}@moshjid.local`
}

async function createAuthUser(name) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to register a new collector')
  }
  const email = authEmailFor(name)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: crypto.randomUUID(), // never used — PIN remains the login method
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { provider: 'pin' },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Already exists (e.g. re-created after a profile cleanup) → reuse it
    if (res.status === 422 || res.status === 400) {
      const list = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
      ).then(r => r.json()).catch(() => ({}))
      const existing = list?.users?.[0]
      if (existing) return existing.id
    }
    throw new Error(`Failed to create auth user: ${JSON.stringify(body)}`)
  }
  const data = await res.json()
  return data.id
}

async function resolveProfile(pool, name, role) {
  const found = await pool.query(
    'SELECT id FROM profiles WHERE full_name = $1 ORDER BY created_at DESC LIMIT 1',
    [name]
  )
  if (found.rows[0]) return found.rows[0].id

  const userId = await createAuthUser(name)
  const dbRole = role === 'admin' ? 'admin' : 'collector'
  await pool.query(
    `INSERT INTO profiles (id, full_name, role, status)
     VALUES ($1, $2, $3::user_role, 'active'::user_status)`,
    [userId, name, dbRole]
  )
  return userId
}


async function resolveMemberProfile(pool, name) {
  const found = await pool.query(
    `SELECT id FROM profiles WHERE full_name = $1 AND role::text = 'member' AND status::text = 'active' AND is_deleted = false ORDER BY created_at DESC LIMIT 1`,
    [name]
  )
  if (found.rows[0]) return { id: found.rows[0].id, isNew: false }

  const inserted = await pool.query(
    `INSERT INTO profiles (full_name, role, status)
     VALUES ($1, 'member'::user_role, 'active'::user_status)
     RETURNING id`,
    [name]
  )
  return { id: inserted.rows[0].id, isNew: true }
}

async function resolveCategoryId(pool, name, type) {
  const found = await pool.query(
    `SELECT id FROM transaction_categories
      WHERE name = $1 AND type::text = $2 AND is_active = true
      LIMIT 1`,
    [name, type]
  )
  if (found.rows[0]) return found.rows[0].id
  throw new Error('Invalid category')
}

async function getReceiptPrefix(pool) {
  try {
    const { rows } = await pool.query('SELECT receipt_prefix FROM settings LIMIT 1')
    return rows[0]?.receipt_prefix || 'RCPT'
  } catch {
    return 'RCPT'
  }
}

function genReceiptNumber(prefix = 'RCPT') {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${ymd}-${rand}`
}

export default async function handler(req, res) {
  applyCors(res, req)

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifyAuth(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }

  const { date, type, category, description, amount, paymentMethod, enteredBy, notes, donorName, memberId } = req.body || {}

  if (!date || !type || !category || !amount || !enteredBy) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  // Cloud schema requires every row to reference a member or carry a donor name
  const donor = String(donorName || '').trim()
  let selectedMemberId = memberId || null
  if (selectedMemberId && (typeof selectedMemberId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(selectedMemberId))) {
    res.status(400).json({ error: 'Invalid member' })
    return
  }
  if (!selectedMemberId && !donor) {
    // allow anonymous transactions without member/donor (member_id and donor_name both null is allowed by schema)
  }
  const parsedAmount = parseFloat(String(amount).replace(/,/g, ''))
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount' })
    return
  }

  // Accept raw enum value or a form display label
  const method = typeof paymentMethod === 'string' && Object.hasOwn(PAYMENT_METHOD_MAP, paymentMethod)
    ? PAYMENT_METHOD_MAP[paymentMethod]
    : typeof paymentMethod === 'string'
      ? paymentMethod
      : ''

  const collectorName = String(enteredBy).trim()

  try {
    const pool = getPool()
    const [categoryTypes, enums] = await Promise.all([
      pool.query('SELECT DISTINCT type::text AS type FROM transaction_categories WHERE is_active = true'),
      getEnumValues(pool, ['payment_method']),
    ])
    if (!categoryTypes.rows.some(row => row.type === type)) throw new Error('Invalid type')
    if (!enums.payment_method.includes(method)) throw new Error('Invalid payment method')
    if (selectedMemberId) {
      const memberResult = await pool.query(
        `SELECT id FROM profiles
          WHERE id = $1::uuid AND role::text = 'member'
            AND status::text = 'active' AND is_deleted = false`,
        [selectedMemberId]
      )
      if (!memberResult.rows[0]) throw new Error('Invalid member')
    }
    let isNewMember = false
    if (!selectedMemberId && donor) {
      const resolved = await resolveMemberProfile(pool, donor)
      selectedMemberId = resolved.id
      isNewMember = resolved.isNew
    }
    const categoryId = await resolveCategoryId(pool, category, type)
    const profileId = await resolveProfile(pool, collectorName, session.role)
    const collectorId = session.role === 'collector' ? profileId : null
    const prefix = await getReceiptPrefix(pool)

    const combinedNote = [description, notes].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(' | ')

    let inserted = null
    for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
      const receiptNumber = genReceiptNumber(prefix)
      try {
        const { rows } = await pool.query(
          `INSERT INTO transactions
             (date, category_id, amount, description, payment_method, status,
              entered_by, collector_id, receipt_number, donor_name, member_id)
           VALUES ($1::date, $2::uuid, $3::numeric, $4, $5::payment_method,
                   'confirmed'::transaction_status, $6::uuid, $7::uuid, $8, $9, $10::uuid)
           RETURNING id, receipt_number`,
          [date, categoryId, parsedAmount, combinedNote, method, profileId, collectorId, receiptNumber, selectedMemberId ? null : donor, selectedMemberId]
        )
        inserted = rows[0]
      } catch (err) {
        // unique violation on receipt_number → retry with a fresh one
        if (err.code === '23505' && attempt === 0) continue
        throw err
      }
    }

    res.status(201).json({ success: true, id: inserted.id, receiptNumber: inserted.receipt_number, memberId: selectedMemberId, newMember: isNewMember })
  } catch (err) {
    console.error('Add transaction error:', err)
    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message })
      return
    }
    res.status(500).json({ error: err.message })
  }
}
