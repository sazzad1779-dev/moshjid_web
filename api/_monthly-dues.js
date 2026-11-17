function isImamHadyaIncome(row) {
  return row.type === 'income' && /^imam hadi?ya$/i.test(row.category_name?.trim() || '')
}

async function findOrCreateMonthlyDue(client, memberId, date, monthlyAmount) {
  const result = await client.query(
    `INSERT INTO monthly_dues
       (member_id, period, amount_due, amount_paid, status, due_date)
     VALUES (
       $1::uuid,
       date_trunc('month', $2::date)::date,
       $3::numeric,
       0,
       'unpaid'::due_status,
       (date_trunc('month', $2::date) + INTERVAL '1 month - 1 day')::date
     )
     ON CONFLICT (member_id, period)
     DO UPDATE SET amount_due = EXCLUDED.amount_due, updated_at = NOW()
     RETURNING id::text AS id`,
    [memberId, date, monthlyAmount]
  )
  return result.rows[0].id
}

export async function recalculateMonthlyDues(client, dueIds) {
  const ids = [...new Set(dueIds.filter(Boolean))]
  if (!ids.length) return

  // Remove any dues that have no active confirmed transactions linked
  await client.query(
    `DELETE FROM monthly_dues md
      WHERE md.id = ANY($1::uuid[])
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
           WHERE t.monthly_due_id = md.id
             AND COALESCE(t.is_deleted, false) = false
        )
        AND NOT EXISTS (
          SELECT 1
            FROM monthly_due_payments mdp
            JOIN transactions t ON t.id::text = mdp.transaction_id
           WHERE mdp.monthly_due_id = md.id
             AND COALESCE(t.is_deleted, false) = false
        )`,
    [ids]
  )

  await client.query(
    `WITH payments AS (
       SELECT md.id,
              CASE
                WHEN COALESCE(p.monthly_amount, 0) > 0 THEN p.monthly_amount
                ELSE md.amount_due
              END::numeric AS amount_due,
              (
                COALESCE((
                  SELECT SUM(t.amount)
                    FROM transactions t
                    LEFT JOIN transaction_categories tc ON tc.id = t.category_id
                   WHERE t.monthly_due_id = md.id
                     AND tc.type::text = 'income'
                     AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
                     AND t.status::text = 'confirmed'
                     AND COALESCE(t.is_deleted, false) = false
                ), 0)
                +
                COALESCE((
                  SELECT SUM(mdp.amount_paid)
                    FROM monthly_due_payments mdp
                    JOIN transactions t ON t.id::text = mdp.transaction_id
                    LEFT JOIN transaction_categories tc ON tc.id = t.category_id
                   WHERE mdp.monthly_due_id = md.id
                     AND tc.type::text = 'income'
                     AND regexp_replace(lower(btrim(tc.name)), 'hadiya$', 'hadya') = 'imam hadya'
                     AND t.status::text = 'confirmed'
                     AND COALESCE(t.is_deleted, false) = false
                ), 0)
              )::numeric AS amount_paid
         FROM monthly_dues md
         JOIN profiles p ON p.id = md.member_id
        WHERE md.id = ANY($1::uuid[])
     )
     UPDATE monthly_dues md
        SET amount_due = payments.amount_due,
            amount_paid = payments.amount_paid,
            status = CASE
              WHEN md.status::text = 'waived' THEN 'waived'::due_status
              WHEN payments.amount_paid >= payments.amount_due THEN 'paid'::due_status
              WHEN payments.amount_paid > 0 THEN 'partial'::due_status
              ELSE 'unpaid'::due_status
            END,
            updated_at = NOW()
       FROM payments
      WHERE md.id = payments.id`,
    [ids]
  )
}

export async function syncMonthlyDueForTransaction(client, transactionId, requestedPeriods) {
  const result = await client.query(
    `SELECT t.id::text AS id, t.member_id::text AS member_id,
            t.monthly_due_id::text AS monthly_due_id, t.date,
            t.amount,
            t.status::text AS status, COALESCE(t.is_deleted, false) AS is_deleted,
            tc.type::text AS type, tc.name AS category_name,
            p.monthly_amount
       FROM transactions t
       LEFT JOIN transaction_categories tc ON tc.id = t.category_id
       LEFT JOIN profiles p ON p.id = t.member_id
      WHERE t.id::text = $1
      FOR UPDATE OF t`,
    [String(transactionId)]
  )
  const transaction = result.rows[0]
  if (!transaction) throw new Error('Transaction not found')

  const oldDueId = transaction.monthly_due_id
  const existingPayments = await client.query(
    `SELECT mdp.monthly_due_id::text AS due_id, md.period::text AS period
       FROM monthly_due_payments mdp
       JOIN monthly_dues md ON md.id = mdp.monthly_due_id
      WHERE mdp.transaction_id = $1`,
    [String(transactionId)]
  )
  const oldDueIds = [oldDueId, ...existingPayments.rows.map(row => row.due_id)]
  const shouldTrackDue = Boolean(
    transaction.member_id
      && transaction.status === 'confirmed'
      && !transaction.is_deleted
      && Number(transaction.monthly_amount) > 0
      && isImamHadyaIncome(transaction)
  )

  const hasRequestedPeriods = Array.isArray(requestedPeriods)
  const hasExplicitPeriods = hasRequestedPeriods && requestedPeriods.length > 0
  const periods = hasExplicitPeriods
    ? [...new Set(requestedPeriods)].sort()
    : hasRequestedPeriods
      ? [transaction.date]
      : existingPayments.rows.length
        ? [...new Set(existingPayments.rows.map(row => row.period))].sort()
        : [transaction.date]

  if (hasExplicitPeriods && !shouldTrackDue) {
    throw new Error('Invalid month selection: monthly dues require a linked member with a configured monthly amount')
  }

  const newDueIds = []
  if (shouldTrackDue) {
    for (const period of periods) {
      newDueIds.push(await findOrCreateMonthlyDue(
        client,
        transaction.member_id,
        period,
        transaction.monthly_amount
      ))
    }

    await client.query('DELETE FROM monthly_due_payments WHERE transaction_id = $1', [String(transactionId)])

    if (hasExplicitPeriods || (!hasRequestedPeriods && existingPayments.rows.length)) {
      const allocationResult = await client.query(
        `WITH periods AS (
           SELECT due_id, ordinal, count(*) OVER () AS period_count
             FROM unnest($3::uuid[]) WITH ORDINALITY AS selected(due_id, ordinal)
         )
         INSERT INTO monthly_due_payments (transaction_id, monthly_due_id, amount_paid)
         SELECT $1,
                periods.due_id,
                CASE
                  WHEN periods.ordinal = periods.period_count
                    THEN $2::numeric - ROUND($2::numeric / periods.period_count, 2) * (periods.period_count - 1)
                  ELSE ROUND($2::numeric / periods.period_count, 2)
                END
           FROM periods
         ON CONFLICT (transaction_id, monthly_due_id)
         DO UPDATE SET amount_paid = EXCLUDED.amount_paid`,
        [String(transactionId), transaction.amount, newDueIds]
      )
      if (allocationResult.rowCount !== periods.length) {
        throw new Error('Failed to allocate transaction amount across selected months')
      }
      await client.query(
        'UPDATE transactions SET monthly_due_id = NULL WHERE id::text = $1',
        [String(transactionId)]
      )
    } else {
      await client.query(
        'UPDATE transactions SET monthly_due_id = $1::uuid WHERE id::text = $2',
        [newDueIds[0], String(transactionId)]
      )
    }

  } else {
    await client.query('DELETE FROM monthly_due_payments WHERE transaction_id = $1', [String(transactionId)])
    await client.query(
      'UPDATE transactions SET monthly_due_id = NULL WHERE id::text = $1',
      [String(transactionId)]
    )
  }

  await recalculateMonthlyDues(client, [...oldDueIds, ...newDueIds])
  return newDueIds[0] || null
}
