import React from 'react'

export default function Kpi({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'var(--c-surface)', borderRadius: 'var(--radius-md)', padding: '20px 22px',
      boxShadow: 'var(--shadow-card)', border: '1px solid var(--c-border)',
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--c-muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color }}>{value}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: 'var(--c-surface-3)', color }}>
          {icon}
        </div>
      </div>
    </div>
  )
}
