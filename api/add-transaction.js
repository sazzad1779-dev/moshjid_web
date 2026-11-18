import { createHash } from 'node:crypto'
import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { getEnumValues } from './_enum-values.js'
import { getSecret, applyCors, readSessionToken } from './_security.js'
import { syncMonthlyDueForTransaction } from './_monthly-dues.js'
import { resolveMemberProfile } from './_members.js'

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
    const { rows } = await pool.query("SELECT to_jsonb(settings)->>'receipt_prefix' AS receipt_prefix FROM settings LIMIT 1")
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
  if (!['admin', 'super_admin', 'collector'].includes(session.role)) { res.status(403).json({ error: 'Forbidden' }); return }

  return submitTransaction(req.body, res, session)
}

export async function submitTransaction(body, res, session, submission = null) {
  const { date, type, category, description, amount, paymentMethod, enteredBy, notes, donorName, memberId, createMember = false, dueMonths = [], dueYear } = body || {}

  if (!date || !type || !category || !amount || !enteredBy) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  const donor = String(donorName || '').trim()
  const isImamHadyaIncome = type === 'income' && typeof category === 'string' && /^imam hadi?ya$/i.test(category.trim())
  if (typeof createMember !== 'boolean' || (createMember && !donor)) {
    res.status(400).json({ error: 'Invalid member' })
    return
  }
  let selectedMemberId = memberId || null
  if (selectedMemberId && (typeof selectedMemberId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(selectedMemberId))) {
    res.status(400).json({ error: 'Invalid member' })
    return
  }
  const parsedAmount = parseFloat(String(amount).replace(/,/g, ''))
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount' })
    return
  }
  if (!Array.isArray(dueMonths) || dueMonths.length > 12
      || dueMonths.some(month => !Number.isInteger(month) || month < 1 || month > 12)
      || new Set(dueMonths).size !== dueMonths.length) {
    res.status(400).json({ error: 'Invalid month selection' })
    return
  }
  const selectedDuePeriods = []
  if (dueMonths.length) {
    if (!selectedMemberId && !donor) {
      res.status(400).json({ error: 'Invalid member. Select an existing member or enter a new member name.' })
      return
    }
    const selectedYear = Number(dueYear)
    if (!Number.isInteger(selectedYear) || selectedYear < 2000 || selectedYear > 2200) {
      res.status(400).json({ error: 'Invalid month year' })
      return
    }
    selectedDuePeriods.push(...dueMonths
      .slice()
      .sort((a, b) => a - b)
      .map(month => `${selectedYear}-${String(month).padStart(2, '0')}-01`))
  }

  // Accept raw enum value or a form display label
  const method = typeof paymentMethod === 'string' && Object.hasOwn(PAYMENT_METHOD_MAP, paymentMethod)
    ? PAYMENT_METHOD_MAP[paymentMethod]
    : typeof paymentMethod === 'string'
      ? paymentMethod
      : ''

  const collectorName = session.role === 'collector' ? String(session.name || 'Collector').trim() : String(enteredBy).trim()

  try {
    const pool = getPool()
    let categoryId
    let prefix
    let profileId = session.id
    if (!submission) {
      categoryId = await resolveCategoryId(pool, category, type)
      const enums = await getEnumValues(pool, ['payment_method'])
      if (!enums.payment_method.includes(method)) throw new Error('Invalid payment method')
      prefix = await getReceiptPrefix(pool)
      profileId = await resolveProfile(pool, collectorName, session.role)
    }
    const collectorId = session.role === 'collector' ? profileId : null
    const combinedNote = [description, notes].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(' | ')

    const payloadHash = submission && createHash('sha256').update(JSON.stringify([
      date, type, category, description, amount, paymentMethod, notes, donorName,
      memberId, createMember, dueMonths, dueYear,
    ])).digest('hex')
    const client = await pool.connect()
    let inserted = null
    let isNewMember = false
    let response
    try {
      await client.query('BEGIN')
      if (submission) {
        const actor = await client.query(
          `SELECT id FROM profiles WHERE id = $1 AND role::text = $2
            AND status::text = 'active' AND is_deleted = false FOR SHARE`,
          [profileId, session.role]
        )
        if (!actor.rowCount) {
          await client.query('ROLLBACK')
          return res.status(403).json({ error: 'Your staff access has changed. Sign in again.' })
        }
        const claim = await client.query(
          `INSERT INTO mobile_submissions (actor_id, submission_id, payload_hash)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING submission_id`,
          [profileId, submission, payloadHash]
        )
        if (!claim.rowCount) {
          const { rows: [previous] } = await client.query(
            'SELECT payload_hash, result FROM mobile_submissions WHERE actor_id = $1 AND submission_id = $2',
            [profileId, submission]
          )
          await client.query('COMMIT')
          if (previous.payload_hash !== payloadHash) {
            return res.status(409).json({ error: 'This submission ID already belongs to another payload.' })
          }
          return res.status(200).json(previous.result)
        }
      }
      if (submission) {
        categoryId = await resolveCategoryId(client, category, type)
        const enums = await getEnumValues(client, ['payment_method'])
        if (!enums.payment_method.includes(method)) throw new Error('Invalid payment method')
        const { rows } = await client.query("SELECT to_jsonb(settings)->>'receipt_prefix' AS receipt_prefix FROM settings LIMIT 1")
        prefix = rows[0]?.receipt_prefix || 'RCPT'
      }
      if (selectedMemberId) {
        const memberResult = await client.query(
          `SELECT id FROM profiles
            WHERE id = $1::uuid AND role::text = 'member'
              AND status::text = 'active' AND is_deleted = false
              AND ($2::uuid IS NULL OR collector_id = $2::uuid)
            FOR SHARE`,
          [selectedMemberId, submission ? collectorId : null]
        )
        if (!memberResult.rows[0]) throw new Error('Invalid member')
      }
      if (!selectedMemberId && donor && (isImamHadyaIncome || createMember)) {
        const resolved = await resolveMemberProfile(client, donor, submission ? collectorId : null)
        selectedMemberId = resolved.id
        isNewMember = resolved.isNew
      }
      for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
        const receiptNumber = genReceiptNumber(prefix)
        const { rows } = await client.query(
          `INSERT INTO transactions
             (date, category_id, amount, description, payment_method, status,
              entered_by, collector_id, receipt_number, donor_name, member_id)
           VALUES ($1::date, $2::uuid, $3::numeric, $4, $5::payment_method,
                   'confirmed'::transaction_status, $6::uuid, $7::uuid, $8, $9, $10::uuid)
           ON CONFLICT (receipt_number) DO NOTHING
           RETURNING id, receipt_number`,
          [date, categoryId, submission ? amount : parsedAmount, combinedNote, method, profileId, collectorId, receiptNumber, selectedMemberId ? null : donor, selectedMemberId]
        )
        inserted = rows[0]
      }
      if (!inserted) throw new Error('Could not allocate a unique receipt number')
      await syncMonthlyDueForTransaction(client, inserted.id, selectedDuePeriods)
      response = { success: true, id: inserted.id, receiptNumber: inserted.receipt_number, memberId: selectedMemberId, newMember: isNewMember }
      if (submission) {
        await client.query(
          'UPDATE mobile_submissions SET result = $3 WHERE actor_id = $1 AND submission_id = $2',
          [profileId, submission, JSON.stringify(response)]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.status(201).json(response)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message })
      return
    }
    console.error('Add transaction error:', err)
    res.status(500).json({ error: 'We couldn’t save the transaction.' })
  }
}
