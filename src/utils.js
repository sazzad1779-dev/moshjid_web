// Expects your Google Sheet to have columns (header names are matched
// case-insensitively, so "Date"/"তারিখ", "Type"/"ধরন", "Category"/"খাত",
// "Amount"/"পরিমাণ" all work as long as you rename them below).
//
// Minimum required columns: Date, Type, Category, Amount
// Type should contain "income"/"আয়" or "expense"/"ব্যয়" (case-insensitive)

const norm = (s) => (s || '').toString().trim().toLowerCase()

function findKey(row, candidates) {
  const keys = Object.keys(row)
  for (const cand of candidates) {
    const hit = keys.find((k) => norm(k) === norm(cand))
    if (hit) return hit
  }
  for (const cand of candidates) {
    const c = norm(cand)
    const hit = keys.find((k) => norm(k).includes(c))
    if (hit) return hit
  }
  return null
}

export function parseRows(rawRows) {
  if (!rawRows.length) return []

  const sample = rawRows[0]
  const dateKey = findKey(sample, ['date of transaction', 'date', 'তারিখ'])
  const typeKey = findKey(sample, ['transaction type', 'type', 'ধরন'])
  const categoryKey = findKey(sample, ['category', 'খাত', 'ক্যাটাগরি'])
  const amountKey = findKey(sample, ['amount', 'টাকা', 'পরিমাণ'])
  const noteKey = findKey(sample, ['description', 'note', 'notes', 'মন্তব্য', 'বিবরণ'])

  return rawRows
    .filter((r) => r[amountKey] && !isNaN(parseFloat(String(r[amountKey]).replace(/,/g, ''))))
    .map((r) => {
      const rawType = norm(r[typeKey])
      const isIncome = rawType.includes('income') || rawType.includes('আয়')
      return {
        date: dateKey ? r[dateKey] : '',
        type: isIncome ? 'income' : 'expense',
        category: categoryKey ? (r[categoryKey] || 'Uncategorized') : 'Uncategorized',
        amount: parseFloat(String(r[amountKey]).replace(/,/g, '')) || 0,
        note: noteKey ? r[noteKey] : '',
      }
    })
}

export function computeSummary(rows) {
  const totalIncome = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const balance = totalIncome - totalExpense

  const byCategory = {}
  rows.forEach((r) => {
    const key = `${r.type}:${r.category}`
    byCategory[key] = (byCategory[key] || 0) + r.amount
  })
  const categoryBreakdown = Object.entries(byCategory).map(([key, amount]) => {
    const [type, category] = key.split(':')
    return { type, category, amount }
  })

  const byMonth = {}
  rows.forEach((r) => {
    const d = new Date(r.date)
    const monthKey = isNaN(d) ? 'Unknown' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, income: 0, expense: 0 }
    byMonth[monthKey][r.type] += r.amount
  })
  const monthlySummary = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))

  return { totalIncome, totalExpense, balance, categoryBreakdown, monthlySummary }
}

export function formatTaka(amount) {
  return '৳' + Math.round(amount).toLocaleString('en-IN')
}
