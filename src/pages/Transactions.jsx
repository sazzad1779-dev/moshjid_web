import React, { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import ChartShell from '../components/ChartShell.jsx'
import TableShell from '../components/TableShell.jsx'
import StatusDot from '../components/StatusDot.jsx'
import TransactionFilters from '../components/TransactionFilters.jsx'
import Pagination from '../components/Pagination.jsx'
import { formatTaka, formatDate } from '../utils/formatters.js'
import { filterTransactions } from '../utils/computations.js'
import { COLORS } from '../constants.js'

const PAGE_SIZE = 10

export default function Transactions({ rows, summary, categories }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() =>
    filterTransactions(rows, { search, type, category, dateStart, dateEnd }),
    [rows, search, type, category, dateStart, dateEnd])

  const paginated = useMemo(() =>
    filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleClear = () => {
    setSearch(''); setType('all'); setCategory('all'); setDateStart(''); setDateEnd(''); setCurrentPage(1)
  }

  const { stats, dailyData } = summary

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title="All Transactions" subtitle="Search, filter, and browse complete financial records">
        <TransactionFilters
          search={search} onSearchChange={v => { setSearch(v); setCurrentPage(1) }}
          type={type} onTypeChange={v => { setType(v); setCurrentPage(1) }}
          category={category} onCategoryChange={v => { setCategory(v); setCurrentPage(1) }}
          categories={categories}
          dateStart={dateStart} onDateStartChange={v => { setDateStart(v); setCurrentPage(1) }}
          dateEnd={dateEnd} onDateEndChange={v => { setDateEnd(v); setCurrentPage(1) }}
        />

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#8898aa', fontSize: 14 }}>Showing {filtered.length} records</span>
          <button onClick={handleClear} style={{ border: '1px solid #dfe6ea', background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#5f6b7a', fontWeight: 600, fontSize: 13 }}>
            Clear Filters
          </button>
        </div>

        <TableShell
          data={paginated}
          columns={[
            { header: 'Date', key: 'date', width: '120px', render: r => formatDate(r.date) },
            { header: 'Type', key: 'type', render: r => <StatusDot type={r.type} /> },
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount', align: 'right',
              render: r => <strong style={{ color: r.type === 'income' ? COLORS.income : COLORS.expense }}>{formatTaka(r.amount)}</strong> },
            { header: 'Note', key: 'note' },
          ]}
        />

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </ChartShell>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartShell title="Daily Activity Pattern" subtitle="Net flow per day">
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8898aa' }} />
              <YAxis tick={{ fontSize: 12, fill: '#8898aa' }} tickFormatter={v => '৳' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={v => formatTaka(v)} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={dailyData} name="Net Flow">
                {dailyData.map((e, i) => <Cell key={i} fill={e.net >= 0 ? COLORS.income : COLORS.expense} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Summary Statistics" subtitle="Aggregated insights">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Highest Income', value: formatTaka(stats.highestIncome), color: COLORS.income },
              { label: 'Highest Expense', value: formatTaka(stats.highestExpense), color: COLORS.expense },
              { label: 'Average Transaction', value: formatTaka(stats.avgTransaction), color: COLORS.balance },
              { label: 'Date Range', value: stats.dateRange ? `${formatDate(stats.dateRange.start)} — ${formatDate(stats.dateRange.end)}` : 'N/A', color: COLORS.accent },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid #eef2f5' : 'none' }}>
                <span style={{ color: '#5f6b7a', fontSize: 14 }}>{s.label}</span>
                <strong style={{ color: s.color, fontSize: 15 }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </ChartShell>
      </div>
    </div>
  )
}
