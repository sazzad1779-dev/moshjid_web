import React from 'react'

export default function Bar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: '#eef2f5', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      {label && <span style={{ fontSize: 12, fontWeight: 700, color: '#5f6b7a', minWidth: 50, textAlign: 'right' }}>{label}</span>}
    </div>
  )
}
