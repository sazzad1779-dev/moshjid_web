export function toMonthKey(date) {
  const d = parseDateValue(date)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function computeSummary(rows) {
  const totalIncome = rows
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + r.amount, 0)

  const totalExpense = rows
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0)

  const balance = totalIncome - totalExpense

  const byCategory = {}
  rows.forEach(r => {
    const key = `${r.type}:${r.category}`
    byCategory[key] = (byCategory[key] || 0) + r.amount
  })

  const categoryBreakdown = Object.entries(byCategory)
    .map(([key, amount]) => {
      const [type, category] = key.split(':')
      return { type, category, amount }
    })
    .sort((a, b) => b.amount - a.amount)

  const byMonth = {}
  rows.forEach(r => {
    const mk = toMonthKey(r.date)
    if (!mk) return
    if (!byMonth[mk]) {
      byMonth[mk] = { month: mk, income: 0, expense: 0, transactions: 0 }
    }
    byMonth[mk][r.type] += r.amount
    byMonth[mk].transactions += 1
  })

  const monthlySummary = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      ...item,
      balance: item.income - item.expense,
      savingsRate: item.income > 0 ? ((item.income - item.expense) / item.income * 100) : 0
    }))

  const byDate = {}
  rows.forEach(r => {
    if (!byDate[r.date]) {
      byDate[r.date] = { date: r.date, income: 0, expense: 0, net: 0 }
    }
    byDate[r.date][r.type] += r.amount
    byDate[r.date].net = byDate[r.date].income - byDate[r.date].expense
  })

  const dailyData = Object.values(byDate).sort((a, b) => {
    const da = parseDateValue(a.date)
    const db = parseDateValue(b.date)
    return (da?.getTime() || 0) - (db?.getTime() || 0)
  })

  const incomeRows = rows.filter(r => r.type === 'income')
  const expenseRows = rows.filter(r => r.type === 'expense')

  const stats = {
    highestIncome: incomeRows.length ? Math.max(...incomeRows.map(r => r.amount)) : 0,
    highestExpense: expenseRows.length ? Math.max(...expenseRows.map(r => r.amount)) : 0,
    avgTransaction: rows.length ? rows.reduce((s, r) => s + r.amount, 0) / rows.length : 0,
    avgIncome: incomeRows.length ? totalIncome / incomeRows.length : 0,
    avgExpense: expenseRows.length ? totalExpense / expenseRows.length : 0,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,
    categoryCount: new Set(rows.map(r => r.category)).size,
    dateRange: rows.length ? (() => {
      const sorted = [...rows].sort((a, b) => (parseDateValue(a.date)?.getTime() || 0) - (parseDateValue(b.date)?.getTime() || 0))
      return { start: sorted[0].date, end: sorted[sorted.length - 1].date }
    })() : null
  }

  return { 
    totalIncome, 
    totalExpense, 
    balance, 
    categoryBreakdown, 
    monthlySummary, 
    dailyData,
    stats
  }
}

export function getMonthCategoryBreakdown(rows, monthKey) {
  const monthRows = rows.filter(r => toMonthKey(r.date) === monthKey)
  const byCat = {}

  monthRows.forEach(r => {
    const key = `${r.type}:${r.category}`
    byCat[key] = (byCat[key] || 0) + r.amount
  })

  return Object.entries(byCat)
    .map(([key, amount]) => {
      const [type, category] = key.split(':')
      return { type, category, amount }
    })
    .sort((a, b) => b.amount - a.amount)
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function parseDateValue(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  // Strip any trailing time component (e.g. "10/7/2026 12:00:00 AM" → "10/7/2026")
  const dateOnly = raw.split(/[ T]/)[0]
  if (!dateOnly) return null

  // ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = dateOnly.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  // M/D/YYYY or D/M/YYYY
  const slashMatch = dateOnly.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (slashMatch) {
    const [, first, second, yearPart] = slashMatch
    const year = Number(yearPart.length === 2 ? 2000 + Number(yearPart) : yearPart)
    const firstNum = Number(first)
    const secondNum = Number(second)

    let month, day
    if (firstNum > 12) {
      // First > 12 → must be day → D/M
      day = firstNum
      month = secondNum
    } else if (secondNum > 12) {
      // Second > 12 → must be day → M/D
      day = secondNum
      month = firstNum
    } else {
      // Both ≤ 12 — assume M/D (Google Sheets US format)
      month = firstNum
      day = secondNum
    }
    return new Date(year, month - 1, day)
  }

  // Fallback: try native parsing, then normalize to midnight
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export function filterTransactions(rows, { search, type, category, dateStart, dateEnd }) {
  const normalizedSearch = normalizeText(search)
  const startDate = parseDateValue(dateStart)
  const endDateRaw = parseDateValue(dateEnd)
  // Make endDate inclusive: set to 23:59:59.999 so same-day transactions match
  const endDate = endDateRaw ? new Date(endDateRaw.getTime() + 86400000 - 1) : null

  return rows.filter((r) => {
    const rowDate = parseDateValue(r.date)
    const matchesSearch = !normalizedSearch ||
      normalizeText(r.category).includes(normalizedSearch) ||
      normalizeText(r.note).includes(normalizedSearch) ||
      normalizeText(r.date).includes(normalizedSearch)
    const matchesType = type === 'all' || r.type === type
    const matchesCategory = category === 'all' || r.category === category
    const matchesDate = (!startDate || (rowDate && rowDate >= startDate)) &&
      (!endDate || (rowDate && rowDate <= endDate))
    return matchesSearch && matchesType && matchesCategory && matchesDate
  }).sort((a, b) => new Date(b.date) - new Date(a.date))
}