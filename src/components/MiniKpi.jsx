import React from 'react'

export default function MiniKpi({ label, value, color }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #eef2f5' }}>
      <div style={{ fontSize: 11, color: '#8898aa', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color }}>{value}</div>
    </div>
  )
}
