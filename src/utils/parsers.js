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
  if (!rawRows?.length) return []

  const sample = rawRows[0]
  const dateKey = findKey(sample, ['date of transaction', 'date', 'তারিখ', 'তারিখ'])
  const typeKey = findKey(sample, ['transaction type', 'type', 'ধরন', 'টাইপ'])
  const categoryKey = findKey(sample, ['category', 'খাত', 'ক্যাটাগরি', 'বিভাগ'])
  const amountKey = findKey(sample, ['amount', 'টাকা', 'পরিমাণ', 'টাকার পরিমাণ'])
  const noteKey = findKey(sample, ['description', 'note', 'notes', 'মন্তব্য', 'বিবরণ', 'বর্ণনা'])

  return rawRows
    .filter((r) => {
      const rawAmount = r[amountKey]
      if (!rawAmount) return false
      const cleaned = String(rawAmount).replace(/,/g, '').replace(/৳/g, '').trim()
      return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) !== 0
    })
    .map((r) => {
      const rawType = norm(r[typeKey])
      const isIncome = rawType.includes('income') || rawType.includes('আয়') || rawType.includes('income')
      const cleanedAmount = String(r[amountKey]).replace(/,/g, '').replace(/৳/g, '').trim()

      return {
        date: dateKey ? String(r[dateKey]).trim() : '',
        type: isIncome ? 'income' : 'expense',
        category: categoryKey ? (r[categoryKey] || 'Uncategorized').trim() : 'Uncategorized',
        amount: parseFloat(cleanedAmount) || 0,
        note: noteKey ? String(r[noteKey] || '').trim() : '',
      }
    })
    .filter(r => r.date && r.amount > 0)
}