import React from 'react'

export default function StatusDot({ type }) {
  const isIncome = type === 'income'
  const bg = isIncome ? 'var(--tint-income)' : 'var(--tint-expense)'
  const fg = isIncome ? 'var(--c-income)' : 'var(--c-expense)'
  const bd = isIncome ? 'var(--tint-income-border)' : 'var(--tint-expense-border)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: fg, flexShrink: 0 }} />
      {isIncome ? 'Income' : 'Expense'}
    </span>
  )
}
