export const COLORS = {
  income: '#2E7D32',
  expense: '#C62828',
  balance: '#1565C0',
  warning: '#EF6C00',
  accent: '#7c4d12',
  palette: ['#2E7D32','#C62828','#1565C0','#EF6C00','#6A1B9A','#00838F','#AD1457','#5D4037','#455A64','#E64A19']
}

export const TAB_ICONS = {
  home: '🏠', dashboard: '📊', monthly: '📅', transactions: '📋', admin: '🔐', about: 'ℹ️'
}

export const KPI_META = [
  { key: 'totalIncome', label: 'Total Income', color: COLORS.income, icon: '💰' },
  { key: 'totalExpense', label: 'Total Expense', color: COLORS.expense, icon: '💸' },
  { key: 'balance', label: 'Net Balance', color: COLORS.balance, icon: '⚖️' },
  { key: 'txnCount', label: 'Transactions', color: COLORS.accent, icon: '📑' },
]
