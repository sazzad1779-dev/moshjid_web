import React, { useMemo } from 'react'
import ChartShell from './ChartShell.jsx'
import { formatTaka } from '../utils/formatters.js'
import { COLORS } from '../constants.js'

export default function CategorySummary({ rows, selectedType }) {
  const breakdown = useMemo(() => {
    const map = {}

    rows.forEach(r => {
      let groupKey
      if (selectedType === 'all') {
        groupKey = `${r.type}:${r.category}`
      } else {
        groupKey = r.category
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          category: r.category,
          type: r.type,
          amount: 0,
        }
      }
      map[groupKey].amount += r.amount
    })

    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [rows, selectedType])

  const maxAmount = breakdown.length > 0 ? breakdown[0].amount : 1

  const totalByType = useMemo(() => {
    const totals = { income: 0, expense: 0 }
    breakdown.forEach(item => {
      totals[item.type] += item.amount
    })
    return totals
  }, [breakdown])

  return (
    <ChartShell title="Category-wise Summary" subtitle={selectedType === 'all' ? 'Income & expense breakdown by category' : `${selectedType} breakdown by category`}>
      {breakdown.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#8898aa', fontSize: 14 }}>
          No data available for the selected filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {selectedType === 'all' && (
            <div style={{ display: 'flex', gap: 16, padding: '8px 0 16px', borderBottom: '2px solid #eef2f5', marginBottom: 4 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.income }} />
                <span style={{ fontSize: 13, color: '#5f6b7a' }}>Total Income</span>
                <strong style={{ color: COLORS.income, fontSize: 15 }}>{formatTaka(totalByType.income)}</strong>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.expense }} />
                <span style={{ fontSize: 13, color: '#5f6b7a' }}>Total Expense</span>
                <strong style={{ color: COLORS.expense, fontSize: 15 }}>{formatTaka(totalByType.expense)}</strong>
              </div>
            </div>
          )}

          {breakdown.map((item, index) => {
            const color = item.type === 'income' ? COLORS.income : COLORS.expense
            const ratio = item.amount / maxAmount
            const label = selectedType === 'all'
              ? `${item.type === 'income' ? '↗' : '↘'} ${item.category}`
              : item.category

            return (
              <div key={`${item.type}-${item.category}-${index}`} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#3a4a5a', fontWeight: 500 }}>{label}</span>
                  </div>
                  <strong style={{ color, fontSize: 14 }}>{formatTaka(item.amount)}</strong>
                </div>
                <div style={{ height: 6, background: '#eef2f5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(ratio * 100, 2)}%`, background: color, borderRadius: 4, opacity: 0.7, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ChartShell>
  )
}
