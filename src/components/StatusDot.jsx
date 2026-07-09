import React from 'react'

export default function StatusDot({ type }) {
  const isIncome = type === 'income'
  const bg = isIncome ? '#e8f5e9' : '#ffebee'
  const fg = isIncome ? '#2E7D32' : '#C62828'
  const bd = isIncome ? '#c8e6c9' : '#ffcdd2'
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
