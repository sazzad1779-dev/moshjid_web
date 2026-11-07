export async function getEnumValues(pool, typeNames) {
  const { rows } = await pool.query(
    `SELECT t.typname, e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = ANY($1::text[])
      ORDER BY t.typname, e.enumsortorder`,
    [typeNames]
  )
  const result = Object.fromEntries(typeNames.map(name => [name, []]))
  for (const row of rows) {
    result[row.typname]?.push(row.enumlabel)
  }
  return result
}
