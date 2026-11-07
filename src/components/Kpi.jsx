import React from 'react'

export default function Kpi({ label, value, color, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__content">
        <div>
          <div className="kpi-card__label">{label}</div>
          <div className="kpi-card__value" style={{ color }}>{value}</div>
        </div>
        <div className="kpi-card__icon" style={{ color }}>
          {icon}
        </div>
      </div>
    </div>
  )
}
