export const formatTaka = (amount) => {
  if (amount === null || amount === undefined) return '৳0'
  return '৳' + Math.round(amount).toLocaleString('en-IN')
}

export const formatMonthLabel = (monthKey) => {
  if (!monthKey) return 'Select month'
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('en', { month: 'long', year: 'numeric' })
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatPercent = (value, decimals = 1) => {
  if (!isFinite(value)) return '0%'
  return value.toFixed(decimals) + '%'
}