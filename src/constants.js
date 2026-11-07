export const COLORS = {
  income: 'var(--c-income)',
  expense: 'var(--c-expense)',
  balance: 'var(--c-balance)',
  warning: 'var(--c-warning)',
  accent: 'var(--c-accent)',
  palette: [
    'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)',
    'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)', 'var(--chart-10)',
  ]
}

export const TAB_ICONS = {
  home: '🏠', dashboard: '📊', monthly: '📅', transactions: '📋', admin: '🔐'
}

export const KPI_META = [
  { key: 'totalIncome', label: 'Total Income', color: COLORS.income, icon: '💰' },
  { key: 'totalExpense', label: 'Total Expense', color: COLORS.expense, icon: '💸' },
  { key: 'balance', label: 'Net Balance', color: COLORS.balance, icon: '⚖️' },
  { key: 'txnCount', label: 'Transactions', color: COLORS.accent, icon: '📑' },
]
