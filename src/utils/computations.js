export function toMonthKey(date) {
  const d = new Date(date)
  if (isNaN(d)) return ''
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

  const dailyData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))

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
    dateRange: rows.length ? {
      start: rows.reduce((a, b) => a.date < b.date ? a : b).date,
      end: rows.reduce((a, b) => a.date > b.date ? a : b).date
    } : null
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

export function filterTransactions(rows, { search, type, category, dateStart, dateEnd }) {
  return rows.filter(r => {
    const matchesSearch = !search || 
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.note.toLowerCase().includes(search.toLowerCase()) ||
      r.date.includes(search)
    const matchesType = type === 'all' || r.type === type
    const matchesCategory = category === 'all' || r.category === category
    const matchesDate = (!dateStart || r.date >= dateStart) && 
                        (!dateEnd || r.date <= dateEnd)
    return matchesSearch && matchesType && matchesCategory && matchesDate
  }).sort((a, b) => new Date(b.date) - new Date(a.date))
}