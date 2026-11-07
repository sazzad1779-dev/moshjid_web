import React from 'react'

export default function TableShell({ data, columns, emptyText = 'No data available' }) {
  if (!data?.length) {
    return (
      <div className="table-empty">
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <div>{emptyText}</div>
      </div>
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ textAlign: col.align || 'left', width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col, j) => (
                <td key={j} style={{ textAlign: col.align || 'left', color: col.colorFn ? col.colorFn(row) : 'var(--c-ink-2)' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
