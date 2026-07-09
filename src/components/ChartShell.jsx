import React from 'react'

export default function ChartShell({ title, subtitle, children, action, style }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 22,
      boxShadow: '0 12px 28px rgba(16,33,28,0.06)',
      border: '1px solid #eef2f5',
      ...style
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16, flexWrap: 'wrap', gap: 8
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#213143' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: '#8898aa', marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
