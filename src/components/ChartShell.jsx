import React from 'react'

export default function ChartShell({ title, subtitle, children, action, style }) {
  return (
    <div style={{
      background: 'var(--c-surface)',
      borderRadius: 'var(--radius-md)',
      padding: 22,
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--c-border)',
      ...style
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16, flexWrap: 'wrap', gap: 8
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--c-muted-2)', marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
