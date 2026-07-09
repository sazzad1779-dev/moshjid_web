import React from 'react'

export default function Kpi({ label, value, color, icon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 22px',
      boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5',
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(14,29,20,0.1)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(14,29,20,0.06)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color }}>{value}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: color + '15', color }}>
          {icon}
        </div>
      </div>
    </div>
  )
}
