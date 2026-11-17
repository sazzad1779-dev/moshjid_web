import { jwtVerify } from 'jose'
import { getPool } from './_db.js'
import { getEnumValues } from './_enum-values.js'
import { getSecret, applyCors, readSessionToken } from './_security.js'
import { recalculateMonthlyDues, syncMonthlyDueForTransaction } from './_monthly-dues.js'

const PAGE_SIZE_MAX = 50
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

function getIntegerParam(searchParams, key, fallback, min, max) {
  const raw = searchParams.get(key)
  if (raw === null) return fallback
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${key}`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`)
  return value
}

function getDateParam(searchParams, key) {
  const value = searchParams.get(key)
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${key}`)
  }
  return value
}

function getSearchParam(searchParams) {
  const value = (searchParams.get('q') || '').trim()
  if (value.length > 100) throw new Error('Search text is too long')
  return value.replace(/[\\%_]/g, '\\$&')
}

function addTransactionFilters(searchParams, params) {
  const clauses = ['t.is_deleted = false', 't.amount > 0']
  const q = getSearchParam(searchParams)
  const type = searchParams.get('type') || ''
  const category = (searchParams.get('category') || '').trim()
  const from = getDateParam(searchParams, 'from')
  const to = getDateParam(searchParams, 'to')

  if (type && type !== 'all') {
    if (typeof type !== 'string' || !type.trim() || type.trim().length > 100) throw new Error('Invalid type')
    params.push(type)
    clauses.push(`tc.type::text = $${params.length}`)
  }
  if (category && category !== 'all') {
    if (category.length > 100) throw new Error('Invalid category')
    params.push(category)
    clauses.push(`tc.name = $${params.length}`)
  }
  if (from) {
    params.push(from)
    clauses.push(`t.date >= $${params.length}::date`)
  }
  if (to) {
    params.push(to)
    clauses.push(`t.date <= $${params.length}::date`)
  }
  if (q) {
    params.push(`%${q}%`)
    const index = params.length
    clauses.push(`(t.description ILIKE $${index} OR t.donor_name ILIKE $${index} OR t.receipt_number ILIKE $${index} OR tc.name ILIKE $${index} OR p.full_name ILIKE $${index})`)
  }

  return clauses.join(' AND ')
}

function mapTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type || 'other',
    category: row.category || 'Uncategorized',
    amount: Number(row.amount),
    note: row.note || '',
    status: row.status,
    paymentMethod: row.payment_method || 'cash',
    donorName: row.donor_name || '',
    memberName: row.member_name || '',
    dueMonths: row.due_months || [],
    dueYear: row.due_year || Number(row.date?.slice(0, 4)),
    receiptNumber: row.receipt_number || '',
  }
}

const TRANSACTION_SELECT = `
  SELECT t.id::text AS id,
         to_char(t.date, 'YYYY-MM-DD') AS date,
         tc.type::text AS type,
         tc.name AS category,
         t.amount,
         t.description AS note,
         t.status::text AS status,
         t.payment_method::text AS payment_method,
         t.donor_name,
         p.full_name AS member_name,
         COALESCE((
           SELECT array_agg(EXTRACT(MONTH FROM md.period)::int ORDER BY md.period)
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
            WHERE mdp.transaction_id = t.id::text
         ), ARRAY[]::int[]) AS due_months,
         (
           SELECT EXTRACT(YEAR FROM MIN(md.period))::int
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
            WHERE mdp.transaction_id = t.id::text
         ) AS due_year,
         t.receipt_number
    FROM transactions t
    LEFT JOIN transaction_categories tc ON tc.id = t.category_id
    LEFT JOIN profiles p ON p.id = t.member_id`

async function getTransactionInput(pool, body) {
  const { id, date, type, category, amount, note, paymentMethod, donorName, dueMonths } = body || {}
  if (typeof id !== 'string' || id.length < 1 || id.length > 100) throw new Error('Invalid transaction id')
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
  const parsedDate = new Date(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Invalid date')
  if (typeof type !== 'string' || !type.trim() || type.trim().length > 100) throw new Error('Invalid type')
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 100) throw new Error('Invalid category')
  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error('Invalid amount')
  const enums = await getEnumValues(pool, ['payment_method'])
  if (typeof paymentMethod !== 'string' || !enums.payment_method.includes(paymentMethod)) throw new Error('Invalid payment method')
  if (typeof note !== 'string' || note.length > 5000) throw new Error('Invalid description')
  if (typeof donorName !== 'string' || donorName.length > 500) throw new Error('Invalid donor name')
  if (dueMonths !== undefined && (!Array.isArray(dueMonths)
      || dueMonths.length > 12
      || dueMonths.some(month => !Number.isInteger(month) || month < 1 || month > 12)
      || new Set(dueMonths).size !== dueMonths.length)) {
    throw new Error('Invalid month selection')
  }
  let duePeriods
  if (dueMonths !== undefined) {
    duePeriods = []
    if (dueMonths.length) {
      const dueYear = Number(body.dueYear)
      if (!Number.isInteger(dueYear) || dueYear < 2000 || dueYear > 2200) throw new Error('Invalid month year')
      duePeriods = dueMonths
        .slice()
        .sort((a, b) => a - b)
        .map(month => `${dueYear}-${String(month).padStart(2, '0')}-01`)
    }
  }

  return {
    id,
    date,
    type,
    category: category.trim(),
    amount: parsedAmount,
    note: note.trim(),
    paymentMethod,
    donorName: donorName.trim() || null,
    duePeriods,
  }
}

async function getMemberInput(pool, body, includeId = false) {
  const { id, fullName, phone, email, address, areaId, status, role = 'member', monthlyAmount } = body || {}
  if (includeId && (typeof id !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id))) {
    throw new Error('Invalid member id')
  }
  if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 200) throw new Error('Invalid member name')
  if (typeof phone !== 'string' || phone.trim().length > 50) throw new Error('Invalid phone')
  if (typeof email !== 'string' || email.trim().length > 254 || (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    throw new Error('Invalid email')
  }
  if (typeof address !== 'string' || address.trim().length > 1000) throw new Error('Invalid address')
  const parsedAreaId = areaId === '' || areaId === null || areaId === undefined ? null : areaId
  if (parsedAreaId !== null && (typeof parsedAreaId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(parsedAreaId))) {
    throw new Error('Invalid area')
  }
  if (parsedAreaId !== null) {
    const areaResult = await pool.query('SELECT id FROM areas WHERE id = $1::uuid', [parsedAreaId])
    if (!areaResult.rows[0]) throw new Error('Invalid area')
  }
  const enums = await getEnumValues(pool, ['user_role', 'user_status'])
  if (role !== 'member' || !enums.user_role.includes(role)) throw new Error('Invalid member role')
  if (typeof status !== 'string' || !enums.user_status.includes(status)) throw new Error('Invalid status')
  const parsedMonthlyAmount = monthlyAmount === '' || monthlyAmount === null || monthlyAmount === undefined
    ? null
    : Number(monthlyAmount)
  if (parsedMonthlyAmount !== null && (!Number.isFinite(parsedMonthlyAmount) || parsedMonthlyAmount < 0 || parsedMonthlyAmount > 9999999999.99)) {
    throw new Error('Invalid monthly amount')
  }

  return {
    id,
    fullName: fullName.trim(),
    phone: phone.trim() || null,
    email: email.trim() || null,
    address: address.trim() || null,
    areaId: parsedAreaId,
    role,
    status,
    monthlyAmount: parsedMonthlyAmount,
  }
}

async function createMember(pool, body) {
  const member = await getMemberInput(pool, body)
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create a member')
  }

  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: `member-${crypto.randomUUID()}@moshjid.local`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: member.fullName },
      app_metadata: { provider: 'pin' },
    }),
  })
  if (!authResponse.ok) {
    throw new Error(`Failed to create member auth user (HTTP ${authResponse.status})`)
  }

  const authUser = await authResponse.json()
  if (typeof authUser.id !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(authUser.id)) {
    throw new Error('Supabase returned an invalid member auth user id')
  }

  try {
    await pool.query(
      `INSERT INTO profiles (id, full_name, phone, email, role, status, area_id, address, monthly_amount)
       VALUES ($1::uuid, $2, $3, $4, $5::user_role, $6::user_status, $7::uuid, $8, $9::numeric)
       RETURNING id`,
      [authUser.id, member.fullName, member.phone, member.email, member.role, member.status, member.areaId, member.address, member.monthlyAmount]
    )
  } catch (error) {
    try {
      const cleanupResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      })
      if (!cleanupResponse.ok) {
        console.error(`Failed to clean up auth user ${authUser.id} after member profile insert failed (HTTP ${cleanupResponse.status})`)
      }
    } catch (cleanupError) {
      console.error(`Failed to clean up auth user ${authUser.id} after member profile insert failed:`, cleanupError)
    }
    throw error
  }
  return true
}

async function updateMember(pool, body) {
  const member = await getMemberInput(pool, body, true)
  const client = await pool.connect()
  let transactionIds = []
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `UPDATE profiles
          SET full_name = $1,
              phone = $2,
              email = $3,
              status = $4::user_status,
              area_id = $5::uuid,
              address = $6,
              monthly_amount = $7::numeric,
              updated_at = NOW()
        WHERE id = $8::uuid AND role::text = 'member' AND is_deleted = false
        RETURNING id::text AS id`,
      [member.fullName, member.phone, member.email, member.status, member.areaId, member.address, member.monthlyAmount, member.id]
    )
    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }

    const transactions = await client.query(
      `SELECT DISTINCT ON (date_trunc('month', t.date)) t.id::text AS id
         FROM transactions t
         JOIN transaction_categories tc ON tc.id = t.category_id
        WHERE t.member_id = $1::uuid
          AND tc.type::text = 'income'
          AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
          AND t.status::text = 'confirmed'
          AND COALESCE(t.is_deleted, false) = false
        ORDER BY date_trunc('month', t.date), t.date, t.id`,
      [member.id]
    )
    transactionIds = transactions.rows.map(row => row.id)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  // Best-effort sync of monthly dues; never fail the member save because of it.
  if (transactionIds.length) {
    const syncClient = await pool.connect()
    try {
      await syncClient.query('BEGIN')
      for (const transactionId of transactionIds) {
        await syncMonthlyDueForTransaction(syncClient, transactionId)
      }
      await syncClient.query('COMMIT')
    } catch (error) {
      await syncClient.query('ROLLBACK')
      console.error('Monthly dues sync after member update failed:', error)
    } finally {
      syncClient.release()
    }
  }
  return true
}

async function softDeleteMember(pool, body) {
  const id = body?.id
  if (typeof id !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    throw new Error('Invalid member id')
  }
  const result = await pool.query(
    `UPDATE profiles
        SET is_deleted = true, updated_at = NOW()
      WHERE id = $1::uuid AND role::text = 'member' AND is_deleted = false
      RETURNING id`,
    [id]
  )
  return Boolean(result.rows[0])
}

async function resolveCategoryId(pool, name, type) {
  const found = await pool.query(
    `SELECT id FROM transaction_categories WHERE name = $1 AND type = $2::transaction_type LIMIT 1`,
    [name, type]
  )
  if (found.rows[0]) return found.rows[0].id

  try {
    const inserted = await pool.query(
      `INSERT INTO transaction_categories (name, type, is_active)
       VALUES ($1, $2::transaction_type, true)
       RETURNING id`,
      [name, type]
    )
    return inserted.rows[0].id
  } catch (error) {
    if (error.code === '23505') {
      const again = await pool.query(
        `SELECT id FROM transaction_categories WHERE name = $1 AND type = $2::transaction_type LIMIT 1`,
        [name, type]
      )
      if (again.rows[0]) return again.rows[0].id
    }
    throw error
  }
}

async function updateTransaction(pool, body) {
  const transaction = await getTransactionInput(pool, body)
  const categoryId = await resolveCategoryId(pool, transaction.category, transaction.type)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `UPDATE transactions
          SET date = $1::date,
              category_id = $2::uuid,
              amount = $3::numeric,
              description = $4,
              payment_method = $5::payment_method,
              donor_name = $6,
              updated_at = NOW()
        WHERE id::text = $7 AND is_deleted = false
        RETURNING id`,
      [transaction.date, categoryId, transaction.amount, transaction.note, transaction.paymentMethod, transaction.donorName, transaction.id]
    )
    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }
    await syncMonthlyDueForTransaction(client, result.rows[0].id, transaction.duePeriods)
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function deleteTransaction(pool, body) {
  const id = body?.id
  if (typeof id !== 'string' || id.length < 1 || id.length > 100) throw new Error('Invalid transaction id')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `UPDATE transactions
          SET is_deleted = true, updated_at = NOW()
        WHERE id::text = $1 AND is_deleted = false
        RETURNING id`,
      [id]
    )
    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }
    await syncMonthlyDueForTransaction(client, result.rows[0].id)
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function refreshMonthlyDues(pool) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('refresh_imam_hadya_monthly_dues'))")

    const inserted = await client.query(
      `INSERT INTO monthly_dues
         (member_id, period, amount_due, amount_paid, status, due_date)
       SELECT DISTINCT ON (t.member_id, date_trunc('month', t.date))
              t.member_id,
              date_trunc('month', t.date)::date,
              p.monthly_amount,
              0,
              'unpaid'::due_status,
              (date_trunc('month', t.date) + INTERVAL '1 month - 1 day')::date
         FROM transactions t
         JOIN transaction_categories tc ON tc.id = t.category_id
         JOIN profiles p ON p.id = t.member_id
        WHERE tc.type::text = 'income'
          AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
          AND t.status::text = 'confirmed'
          AND COALESCE(t.is_deleted, false) = false
          AND t.monthly_due_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
          )
          AND COALESCE(p.monthly_amount, 0) > 0
        ORDER BY t.member_id, date_trunc('month', t.date), t.date, t.id
       ON CONFLICT (member_id, period) DO NOTHING
       RETURNING id`
    )

    const linked = await client.query(
      `UPDATE transactions t
          SET monthly_due_id = md.id
         FROM transaction_categories tc, profiles p, monthly_dues md
        WHERE tc.id = t.category_id
          AND p.id = t.member_id
          AND COALESCE(p.monthly_amount, 0) > 0
          AND t.member_id = md.member_id
          AND t.date >= md.period
          AND t.date < md.period + INTERVAL '1 month'
          AND tc.type::text = 'income'
          AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
          AND t.status::text = 'confirmed'
          AND COALESCE(t.is_deleted, false) = false
          AND t.monthly_due_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
          )
        RETURNING t.monthly_due_id::text AS due_id`
    )

    await recalculateMonthlyDues(client, linked.rows.map(row => row.due_id))

    const skipped = await client.query(
      `SELECT count(DISTINCT (t.member_id, date_trunc('month', t.date)))::int AS count
         FROM transactions t
         JOIN transaction_categories tc ON tc.id = t.category_id
         JOIN profiles p ON p.id = t.member_id
        WHERE tc.type::text = 'income'
          AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
          AND t.status::text = 'confirmed'
          AND COALESCE(t.is_deleted, false) = false
          AND t.member_id IS NOT NULL
          AND t.monthly_due_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
          )
          AND COALESCE(p.monthly_amount, 0) <= 0`
    )

    await client.query('COMMIT')
    return {
      insertedDues: inserted.rowCount,
      linkedTransactions: linked.rowCount,
      skippedMonthsWithoutMonthlyAmount: skipped.rows[0].count,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function getTransactions(pool, searchParams, resource) {
  const params = []
  const where = addTransactionFilters(searchParams, params)
  const pageSize = resource === 'overview' ? 5 : getIntegerParam(searchParams, 'pageSize', 10, 1, PAGE_SIZE_MAX)
  const page = getIntegerParam(searchParams, 'page', 1, 1, 100000)
  const offset = (page - 1) * pageSize

  const countQuery = pool.query(
    `SELECT count(*)::int AS total
       FROM transactions t
       LEFT JOIN transaction_categories tc ON tc.id = t.category_id
       LEFT JOIN profiles p ON p.id = t.member_id
      WHERE ${where}`,
    params
  )
  const rowsQuery = pool.query(
    `${TRANSACTION_SELECT}
      WHERE ${where}
      ORDER BY t.date DESC, t.created_at DESC, t.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  )

  const [countResult, rowsResult] = await Promise.all([countQuery, rowsQuery])
  return {
    rows: rowsResult.rows.map(mapTransaction),
    total: countResult.rows[0].total,
    page,
    pageSize,
  }
}

async function getOverview(pool, searchParams) {
  const [transactions, summary, categoryResult] = await Promise.all([
    getTransactions(pool, searchParams, 'overview'),
    pool.query(
      `SELECT count(*)::int AS count,
              COALESCE(sum(t.amount) FILTER (WHERE tc.type::text = 'income'), 0)::numeric AS income,
              COALESCE(sum(t.amount) FILTER (WHERE tc.type::text = 'expense'), 0)::numeric AS expense,
              (SELECT count(*)::int FROM profiles WHERE role::text = 'member' AND is_deleted = false) AS member_count
         FROM transactions t
         LEFT JOIN transaction_categories tc ON tc.id = t.category_id
        WHERE t.is_deleted = false AND t.amount > 0`
    ),
    pool.query(
      `SELECT DISTINCT tc.name
         FROM transaction_categories tc
         JOIN transactions t ON t.category_id = tc.id
        WHERE tc.is_active = true AND t.is_deleted = false
        ORDER BY tc.name`
    ),
  ])
  const totals = summary.rows[0]
  return {
    ...transactions,
    summary: {
      count: totals.count,
      income: Number(totals.income),
      expense: Number(totals.expense),
      memberCount: totals.member_count,
    },
    categories: categoryResult.rows.map(row => row.name),
  }
}

async function getMembers(pool, searchParams) {
  const params = ['member']
  const clauses = ['p.role::text = $1', 'p.is_deleted = false']
  const status = searchParams.get('status') || ''
  const q = getSearchParam(searchParams)
  const enums = await getEnumValues(pool, ['user_status'])
  const page = getIntegerParam(searchParams, 'page', 1, 1, 100000)
  const pageSize = getIntegerParam(searchParams, 'pageSize', 10, 1, PAGE_SIZE_MAX)

  if (status && status !== 'all') {
    if (!enums.user_status.includes(status)) throw new Error('Invalid status')
    params.push(status)
    clauses.push(`p.status::text = $${params.length}`)
  }
  if (q) {
    params.push(`%${q}%`)
    const index = params.length
    clauses.push(`(p.id::text ILIKE $${index} OR p.full_name ILIKE $${index} OR p.member_code ILIKE $${index} OR p.phone ILIKE $${index} OR p.email ILIKE $${index} OR p.address ILIKE $${index} OR p.area_id::text ILIKE $${index})`)
  }

  const where = clauses.join(' AND ')
  const [countResult, rowsResult] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total FROM profiles p WHERE ${where}`, params),
    pool.query(
      `SELECT p.id::text AS id, p.full_name AS "fullName", p.phone, p.email,
              p.area_id::text AS "areaId", p.address,
              p.role::text AS role, p.status::text AS status,
              p.monthly_amount AS "monthlyAmount",
              to_char(p.joined_at, 'YYYY-MM-DD') AS "joinedAt"
         FROM profiles p
        WHERE ${where}
        ORDER BY p.joined_at DESC, p.full_name ASC, p.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ])

  let areaNames = new Map()
  try {
    const areasResult = await pool.query('SELECT id::text AS id, name FROM areas')
    areaNames = new Map(areasResult.rows.map(area => [area.id, area.name]))
  } catch (error) {
    console.error('Member area lookup error:', error)
  }

  return {
    rows: rowsResult.rows.map(row => ({
      ...row,
      area: areaNames.get(row.areaId) || '',
      monthlyAmount: row.monthlyAmount === null ? null : Number(row.monthlyAmount),
    })),
    total: countResult.rows[0].total,
    page,
    pageSize,
  }
}

async function getDues(pool, searchParams) {
  const year = getIntegerParam(searchParams, 'year', new Date().getFullYear(), 2000, 2200)
  const month = getIntegerParam(searchParams, 'month', 0, 0, 12)
  const page = getIntegerParam(searchParams, 'page', 1, 1, 100000)
  const pageSize = getIntegerParam(searchParams, 'pageSize', 10, 1, PAGE_SIZE_MAX)
  const params = [year]
  let where = `md.period >= make_date($1, 1, 1) AND md.period < make_date($1 + 1, 1, 1)`
  if (month) {
    params.push(month)
    where += ` AND extract(month FROM md.period)::int = $${params.length}`
  }

  const [countResult, rowsResult, summaryResult] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total FROM monthly_dues md WHERE ${where}`, params),
    pool.query(
      `SELECT md.id::text AS id, md.member_id::text AS member_id,
              p.member_code, p.full_name AS member_name,
              to_char(md.period, 'YYYY-MM-DD') AS period,
              to_char(md.due_date, 'YYYY-MM-DD') AS due_date,
              md.amount_due, md.amount_paid, md.status::text AS status,
              md.waived_reason
         FROM monthly_dues md
         JOIN profiles p ON p.id = md.member_id
        WHERE ${where}
        ORDER BY md.period DESC, p.full_name ASC, md.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
    pool.query(
      `SELECT count(*)::int AS count,
              COALESCE(sum(amount_due), 0)::numeric AS amount_due,
              COALESCE(sum(amount_paid), 0)::numeric AS amount_paid
         FROM monthly_dues md
        WHERE ${where}`,
      params
    ),
  ])

  return {
    rows: rowsResult.rows.map(row => ({
      ...row,
      amount_due: Number(row.amount_due),
      amount_paid: Number(row.amount_paid),
    })),
    total: countResult.rows[0].total,
    page,
    pageSize,
    year,
    month,
    summary: {
      count: summaryResult.rows[0].count,
      amountDue: Number(summaryResult.rows[0].amount_due),
      amountPaid: Number(summaryResult.rows[0].amount_paid),
    },
  }
}


async function getDueDetail(pool, id) {
  if (typeof id !== 'string' || id.length < 1 || id.length > 100) throw new Error('Invalid due id')

  const dueResult = await pool.query(
    `SELECT md.id::text AS id, md.member_id::text AS member_id,
            p.member_code, p.full_name AS member_name, p.monthly_amount,
            to_char(md.period, 'YYYY-MM-DD') AS period,
            to_char(md.due_date, 'YYYY-MM-DD') AS due_date,
            md.amount_due, md.amount_paid, md.status::text AS status,
            md.waived_reason
       FROM monthly_dues md
       JOIN profiles p ON p.id = md.member_id
      WHERE md.id = $1::uuid`,
    [id]
  )
  const due = dueResult.rows[0]
  if (!due) throw new Error('Due not found')

  const txnResult = await pool.query(
    `SELECT t.id::text AS id, to_char(t.date, 'YYYY-MM-DD') AS date,
            COALESCE(mdp.amount_paid, t.amount) AS amount,
            tc.name AS category, t.receipt_number, t.status::text AS status
       FROM transactions t
       LEFT JOIN transaction_categories tc ON tc.id = t.category_id
       LEFT JOIN monthly_due_payments mdp
         ON mdp.transaction_id = t.id::text AND mdp.monthly_due_id = $1::uuid
      WHERE (t.monthly_due_id = $1::uuid OR mdp.monthly_due_id = $1::uuid)
        AND COALESCE(t.is_deleted, false) = false
      ORDER BY t.date ASC, t.created_at ASC`,
    [id]
  )
  const transactions = txnResult.rows.map(row => ({
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    category: row.category || 'Uncategorized',
    receiptNumber: row.receipt_number || '',
    status: row.status,
  }))

  const totalPaid = transactions.reduce((sum, txn) => sum + txn.amount, 0)
  const amountDue = Number(due.amount_due)
  const amountPaid = Number(due.amount_paid)
  const paymentCount = transactions.length
  const firstPaymentDate = paymentCount ? transactions[0].date : null
  const lastPaymentDate = paymentCount ? transactions[paymentCount - 1].date : null
  const averageTimestamp = paymentCount
    ? transactions.reduce((sum, txn) => sum + new Date(`${txn.date}T00:00:00Z`).getTime(), 0) / paymentCount
    : null
  const averagePaymentDate = averageTimestamp ? new Date(averageTimestamp).toISOString().slice(0, 10) : null
  const averageAmount = paymentCount ? totalPaid / paymentCount : 0

  return {
    due: {
      id: due.id,
      memberId: due.member_id,
      memberName: due.member_name,
      memberCode: due.member_code,
      monthlyAmount: due.monthly_amount === null ? null : Number(due.monthly_amount),
      period: due.period,
      dueDate: due.due_date,
      amountDue,
      amountPaid,
      status: due.status,
      waivedReason: due.waived_reason,
    },
    transactions,
    stats: {
      totalPaid,
      amountDue,
      balance: Math.max(0, amountDue - amountPaid),
      paymentCount,
      firstPaymentDate,
      lastPaymentDate,
      averagePaymentDate,
      averageAmount,
    },
  }
}


async function getDuesMatrix(pool, searchParams) {
  const year = getIntegerParam(searchParams, 'year', new Date().getFullYear(), 2000, 2200)
  const page = getIntegerParam(searchParams, 'page', 1, 1, 100000)
  const pageSize = getIntegerParam(searchParams, 'pageSize', 25, 1, 100)
  const search = (searchParams.get('search') || '').trim()
  if (search.length > 100) throw new Error('Invalid search')

  const totalResult = await pool.query(
    `SELECT count(*) FILTER (
              WHERE $1::text IS NULL
                 OR p.full_name ILIKE '%' || $1 || '%'
                 OR COALESCE(p.member_code, '') ILIKE '%' || $1 || '%'
                 OR COALESCE(p.phone, '') ILIKE '%' || $1 || '%'
            )::int AS total,
            count(*)::int AS member_count
       FROM profiles p
      WHERE p.role::text = 'member'
        AND (
          (p.status::text = 'active'
            AND p.approval_status::text = 'approved'
            AND COALESCE(p.is_deleted, false) = false)
          OR EXISTS (
            SELECT 1
              FROM transactions t
              JOIN transaction_categories tc ON tc.id = t.category_id
             WHERE t.member_id = p.id
               AND tc.type::text = 'income'
               AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
               AND t.status::text = 'confirmed'
               AND COALESCE(t.is_deleted, false) = false
          )
        )`,
    [search || null]
  )
  const total = totalResult.rows[0].total
  const memberCount = totalResult.rows[0].member_count

  const membersResult = await pool.query(
    `SELECT p.id::text AS id, p.full_name AS member_name, p.member_code,
            p.phone, p.email, p.monthly_amount
       FROM profiles p
      WHERE p.role::text = 'member'
        AND (
          (p.status::text = 'active'
            AND p.approval_status::text = 'approved'
            AND COALESCE(p.is_deleted, false) = false)
          OR EXISTS (
            SELECT 1
              FROM transactions t
              JOIN transaction_categories tc ON tc.id = t.category_id
             WHERE t.member_id = p.id
               AND tc.type::text = 'income'
               AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
               AND t.status::text = 'confirmed'
               AND COALESCE(t.is_deleted, false) = false
          )
        )
        AND ($1::text IS NULL
          OR p.full_name ILIKE '%' || $1 || '%'
          OR COALESCE(p.member_code, '') ILIKE '%' || $1 || '%'
          OR COALESCE(p.phone, '') ILIKE '%' || $1 || '%')
      ORDER BY p.full_name ASC
      LIMIT $2 OFFSET $3`,
    [search || null, pageSize, (page - 1) * pageSize]
  )

  const memberIds = membersResult.rows.map(row => row.id)

  const duesResult = memberIds.length
    ? await pool.query(
        `SELECT md.id::text AS id, md.member_id::text AS member_id,
                EXTRACT(MONTH FROM md.period)::int AS month,
                md.amount_due, md.amount_paid, md.status::text AS status,
                to_char(md.due_date, 'YYYY-MM-DD') AS due_date,
                md.waived_reason
           FROM monthly_dues md
          WHERE md.member_id = ANY($1::uuid[])
            AND md.period >= make_date($2, 1, 1)
            AND md.period < make_date($2 + 1, 1, 1)`,
        [memberIds, year]
      )
    : { rows: [] }

  const startsResult = memberIds.length
    ? await pool.query(
        `WITH periods AS (
           SELECT t.member_id, date_trunc('month', t.date)::date AS period
             FROM transactions t
             LEFT JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.member_id = ANY($1::uuid[])
              AND NOT EXISTS (
                SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
              )
              AND (
                t.monthly_due_id IS NOT NULL
                OR (
                  tc.type::text = 'income'
                  AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
                )
              )
           UNION ALL
           SELECT t.member_id, md.period
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
             JOIN transactions t ON t.id::text = mdp.transaction_id
             JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.member_id = ANY($1::uuid[])
         )
         SELECT member_id::text AS member_id, to_char(MIN(period), 'YYYY-MM') AS first_period
           FROM periods
          GROUP BY member_id`,
        [memberIds]
      )
    : { rows: [] }

  const paymentResult = memberIds.length
    ? await pool.query(
        `WITH payments AS (
           SELECT t.member_id,
                  EXTRACT(MONTH FROM t.date)::int AS month,
                  t.amount::numeric AS amount_paid,
                  t.date AS payment_date
             FROM transactions t
             JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.member_id = ANY($1::uuid[])
              AND t.date >= make_date($2, 1, 1)
              AND t.date < make_date($2 + 1, 1, 1)
              AND NOT EXISTS (
                SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
              )
           UNION ALL
           SELECT t.member_id,
                  EXTRACT(MONTH FROM md.period)::int AS month,
                  mdp.amount_paid,
                  t.date AS payment_date
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
             JOIN transactions t ON t.id::text = mdp.transaction_id
             JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.member_id = ANY($1::uuid[])
              AND md.period >= make_date($2, 1, 1)
              AND md.period < make_date($2 + 1, 1, 1)
         )
         SELECT member_id::text AS member_id, month,
                COALESCE(SUM(amount_paid), 0)::numeric AS amount_paid,
                to_char(MAX(payment_date), 'YYYY-MM-DD') AS last_payment_date
           FROM payments
          GROUP BY member_id, month`,
        [memberIds, year]
      )
    : { rows: [] }

  const duesByMember = new Map()
  for (const row of duesResult.rows) {
    if (!duesByMember.has(row.member_id)) duesByMember.set(row.member_id, {})
    duesByMember.get(row.member_id)[row.month] = {
      dueId: row.id,
      month: row.month,
      amountDue: Number(row.amount_due),
      amountPaid: Number(row.amount_paid),
      status: row.status,
      dueDate: row.due_date,
      waivedReason: row.waived_reason,
    }
  }
  const firstPeriodsByMember = new Map(
    startsResult.rows.map(row => {
      const [y, m] = row.first_period.split('-').map(Number)
      return [row.member_id, y * 12 + (m - 1)]
    })
  )
  const paymentsByMember = new Map()
  for (const row of paymentResult.rows) {
    if (!paymentsByMember.has(row.member_id)) paymentsByMember.set(row.member_id, {})
    paymentsByMember.get(row.member_id)[row.month] = {
      amountPaid: Number(row.amount_paid),
      lastPaymentDate: row.last_payment_date,
    }
  }

  const members = membersResult.rows.map(row => {
    const storedMonths = duesByMember.get(row.id) || {}
    const firstPeriod = firstPeriodsByMember.get(row.id)
    const currentDate = new Date()
    const lastStoredMonth = Math.max(0, ...Object.keys(storedMonths).map(Number))
    const lastVisibleMonth = year < currentDate.getFullYear()
      ? 12
      : year === currentDate.getFullYear()
        ? Math.max(currentDate.getMonth() + 1, lastStoredMonth)
        : lastStoredMonth
    const firstMonth = firstPeriod === undefined
      ? 13
      : Math.max(1, firstPeriod - year * 12 + 1)
    const payments = paymentsByMember.get(row.id) || {}
    const months = {}

    for (let month = firstMonth; month <= lastVisibleMonth; month++) {
      const stored = storedMonths[month]
      const amountDue = stored?.amountDue ?? Number(row.monthly_amount || 0)
      const amountPaid = payments[month]?.amountPaid || 0
      if (amountDue <= 0) continue
      const status = stored?.status === 'waived'
        ? 'waived'
        : amountPaid >= amountDue
          ? 'paid'
          : amountPaid > 0
            ? 'partial'
            : 'unpaid'
      const dueDate = stored?.dueDate || new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
      months[month] = {
        dueId: stored?.dueId || null,
        month,
        amountDue,
        amountPaid,
        status,
        dueDate,
        waivedReason: stored?.waivedReason || null,
      }
    }

    const paymentRows = Object.values(payments)
    const lastPaymentDate = paymentRows
      .map(payment => payment.lastPaymentDate)
      .filter(Boolean)
      .sort()
      .at(-1) || null
    const activeDues = Object.values(months).filter(m => m.status !== 'waived')
    const totalDue = activeDues.reduce((sum, m) => sum + m.amountDue, 0)
    const totalPaid = Object.values(months).reduce((sum, m) => sum + m.amountPaid, 0)
    const balance = activeDues.reduce(
      (sum, m) => sum + (m.status === 'paid' ? 0 : Math.max(0, m.amountDue - m.amountPaid)),
      0
    )
    return {
      memberId: row.id,
      memberName: row.member_name,
      memberCode: row.member_code,
      phone: row.phone,
      email: row.email,
      monthlyAmount: row.monthly_amount === null ? null : Number(row.monthly_amount),
      months,
      totalDue,
      totalPaid,
      balance,
      lastPaymentDate,
      transactionTotal: totalPaid,
    }
  })

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const summaryResult = await pool.query(
    `WITH starts AS (
       SELECT member_id, MIN(period)::date AS first_period
         FROM (
           SELECT t.member_id, date_trunc('month', t.date)::date AS period
             FROM transactions t
             LEFT JOIN transaction_categories tc ON tc.id = t.category_id
             JOIN profiles p ON p.id = t.member_id AND p.role::text = 'member'
            WHERE t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.date < make_date($1 + 1, 1, 1)
              AND NOT EXISTS (
                SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
              )
              AND (
                t.monthly_due_id IS NOT NULL
                OR (
                  tc.type::text = 'income'
                  AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
                )
              )
           UNION ALL
           SELECT t.member_id, md.period
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
             JOIN transactions t ON t.id::text = mdp.transaction_id
             JOIN transaction_categories tc ON tc.id = t.category_id
             JOIN profiles p ON p.id = t.member_id AND p.role::text = 'member'
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND md.period < make_date($1 + 1, 1, 1)
         ) member_periods
        GROUP BY member_id
     ),
     due_periods AS (
       SELECT starts.member_id, periods.period::date AS period
         FROM starts
         CROSS JOIN LATERAL generate_series(
           GREATEST(starts.first_period, make_date($1, 1, 1)),
           LEAST(
             make_date($1 + 1, 1, 1) - INTERVAL '1 month',
             date_trunc('month', CURRENT_DATE)::date
           ),
           INTERVAL '1 month'
         ) AS periods(period)
       UNION
       SELECT md.member_id, md.period
         FROM monthly_dues md
        WHERE md.period >= make_date($1, 1, 1)
          AND md.period < make_date($1 + 1, 1, 1)
     ),
     payment_totals AS (
       SELECT member_id, period, SUM(amount_paid)::numeric AS amount_paid
         FROM (
           SELECT t.member_id, date_trunc('month', t.date)::date AS period,
                  t.amount::numeric AS amount_paid
             FROM transactions t
             JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND t.date < make_date($1 + 1, 1, 1)
              AND NOT EXISTS (
                SELECT 1 FROM monthly_due_payments mdp WHERE mdp.transaction_id = t.id::text
              )
           UNION ALL
           SELECT t.member_id, md.period, mdp.amount_paid
             FROM monthly_due_payments mdp
             JOIN monthly_dues md ON md.id = mdp.monthly_due_id
             JOIN transactions t ON t.id::text = mdp.transaction_id
             JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE tc.type::text = 'income'
              AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
              AND t.status::text = 'confirmed'
              AND COALESCE(t.is_deleted, false) = false
              AND md.period < make_date($1 + 1, 1, 1)
         ) payments
        GROUP BY member_id, period
     ),
     monthly AS (
       SELECT dp.member_id, dp.period,
              COALESCE(md.amount_due, p.monthly_amount, 0)::numeric AS amount_due,
              COALESCE(pt.amount_paid, 0)::numeric AS amount_paid,
              COALESCE(md.status::text, 'unpaid') AS status
         FROM due_periods dp
         JOIN profiles p ON p.id = dp.member_id
         LEFT JOIN monthly_dues md
           ON md.member_id = dp.member_id AND md.period = dp.period
         LEFT JOIN payment_totals pt
           ON pt.member_id = dp.member_id AND pt.period = dp.period
     )
     SELECT COALESCE(SUM(amount_due) FILTER (WHERE status <> 'waived'), 0)::numeric AS total_due,
            COALESCE(SUM(amount_paid), 0)::numeric AS total_paid,
            COALESCE(
              SUM(GREATEST(amount_due - amount_paid, 0))
                FILTER (WHERE status NOT IN ('paid', 'waived')),
              0
            )::numeric AS balance
       FROM monthly
      WHERE amount_due > 0`,
    [year]
  )

  return {
    year,
    months: monthNames,
    monthNames,
    members,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      memberCount,
      totalDue: Number(summaryResult.rows[0].total_due),
      totalPaid: Number(summaryResult.rows[0].total_paid),
      balance: Number(summaryResult.rows[0].balance),
    },
  }
}

export default async function handler(req, res) {
  applyCors(res, req)
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifySession(req)
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return }
  if (!['admin', 'super_admin'].includes(session.role)) { res.status(403).json({ error: 'Forbidden' }); return }

  const searchParams = new URL(req.url, 'http://localhost').searchParams
  const resource = searchParams.get('resource')
  if (req.method !== 'GET') {
    const isMemberMutation = resource === 'members' && ['POST', 'PATCH', 'DELETE'].includes(req.method)
    const isTransactionMutation = resource === 'transactions' && ['PATCH', 'DELETE'].includes(req.method)
    const isDuesRefresh = resource === 'dues-refresh' && req.method === 'POST'
    if (!isMemberMutation && !isTransactionMutation && !isDuesRefresh) {
      res.status(405).json({ error: 'Method not allowed for this resource' })
      return
    }
    if (!process.env.DATABASE_URL) {
      res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
      return
    }

    try {
      const pool = getPool()
      if (isDuesRefresh) {
        const result = await refreshMonthlyDues(pool)
        res.setHeader('Cache-Control', 'no-store')
        res.status(200).json({ success: true, ...result })
        return
      }
      const changed = isMemberMutation
        ? req.method === 'POST'
          ? await createMember(pool, req.body)
          : req.method === 'PATCH'
            ? await updateMember(pool, req.body)
            : await softDeleteMember(pool, req.body)
        : req.method === 'PATCH'
          ? await updateTransaction(pool, req.body)
          : await deleteTransaction(pool, req.body)
      if (!changed) {
        res.status(404).json({ error: isMemberMutation ? 'Member not found.' : 'Transaction not found.' })
        return
      }
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).json({ success: true })
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid ')) {
        res.status(400).json({ error: error.message })
        return
      }
      if (error instanceof Error && error.message === 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create a member') {
        res.status(503).json({ error: 'Member creation is unavailable because Supabase Auth is not configured.' })
        return
      }
      if (error instanceof Error && error.message.startsWith('Failed to create member auth user')) {
        res.status(502).json({ error: 'Supabase Auth could not create the member identity.' })
        return
      }
      if (isMemberMutation && (error?.code === '42P10' || error?.code === '42703')) {
        res.status(500).json({ error: 'The database is missing a required member or monthly-dues schema update. Run schema.sql in the Supabase SQL Editor.' })
        return
      }
      console.error('Admin data mutation error:', error)
      res.status(500).json({
        error: isMemberMutation
          ? 'Failed to save member.'
          : isDuesRefresh
            ? `Failed to refresh monthly dues from transactions: ${error instanceof Error ? error.message : 'Unknown database error'}`
            : 'Failed to update transaction.',
      })
    }
    return
  }

  if (!['overview', 'transactions', 'members', 'dues', 'due-detail', 'dues-matrix'].includes(resource)) {
    res.status(400).json({ error: 'Invalid resource' })
    return
  }
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL environment variable is not set.' })
    return
  }

  try {
    const pool = getPool()
    const data = resource === 'overview'
      ? await getOverview(pool, searchParams)
      : resource === 'transactions'
        ? await getTransactions(pool, searchParams, resource)
        : resource === 'members'
          ? await getMembers(pool, searchParams)
          : resource === 'due-detail'
            ? await getDueDetail(pool, searchParams.get('id'))
            : resource === 'dues-matrix'
              ? await getDuesMatrix(pool, searchParams)
              : await getDues(pool, searchParams)

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(data)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid ')) {
      res.status(400).json({ error: error.message })
      return
    }
    console.error('Admin data API error:', error)
    res.status(500).json({ error: 'Failed to load admin data.' })
  }
}
