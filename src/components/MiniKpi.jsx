import React from 'react'

export default function MiniKpi({ label, value, color }) {
  return (
    <div style={{ background: 'var(--c-surface-2)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--c-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--c-muted-2)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color }}>{value}</div>
    </div>
  )
}
