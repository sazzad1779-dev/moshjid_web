import React from 'react'

export default function ChartShell({ title, subtitle, children, action, style }) {
  return (
    <section className="chart-shell" style={style}>
      <div className="chart-shell__header">
        <div>
          {title && <h2 className="chart-shell__title">{title}</h2>}
          {subtitle && <div className="chart-shell__subtitle">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
