import React from 'react'

const th = { padding: '12px 14px', fontWeight: 700, color: '#506174', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', textAlign: 'left' }
const td = { padding: '12px 14px', color: '#344150', fontSize: 14, whiteSpace: 'nowrap' }

export default function TableShell({ data, columns, emptyText = 'No data available' }) {
  if (!data?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8898aa' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <div>{emptyText}</div>
      </div>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8ecef' }}>
            {columns.map((col, i) => (
              <th key={i} style={{ ...th, textAlign: col.align || 'left', width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f3f6', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {columns.map((col, j) => (
                <td key={j} style={{ ...td, textAlign: col.align || 'left', color: col.colorFn ? col.colorFn(row) : '#344150' }}>
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
