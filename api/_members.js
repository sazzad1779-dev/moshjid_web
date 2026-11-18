import { randomUUID } from 'node:crypto'

export async function resolveMemberProfile(client, name, collectorId = null) {
  // Serialize resolution of the same name across transaction creates and edits.
  await client.query('SELECT pg_advisory_xact_lock(hashtext(lower($1)), 0)', [name])
  const found = await client.query(
    `SELECT id FROM profiles
      WHERE lower(full_name) = lower($1) AND role::text = 'member'
        AND status::text = 'active' AND is_deleted = false
        AND ($2::uuid IS NULL OR collector_id = $2::uuid)
      ORDER BY (full_name = $1) DESC, created_at DESC, id
      LIMIT 1 FOR SHARE`,
    [name, collectorId]
  )
  if (found.rows[0]) return { id: found.rows[0].id, isNew: false }

  const inserted = await client.query(
    `INSERT INTO profiles (id, full_name, role, status, collector_id)
     VALUES ($1::uuid, $2, 'member'::user_role, 'active'::user_status, $3::uuid)
     RETURNING id`,
    [randomUUID(), name, collectorId]
  )
  return { id: inserted.rows[0].id, isNew: true }
}
