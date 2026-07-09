import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, Line
} from 'recharts'
import ChartShell from '../components/ChartShell.jsx'
import MiniKpi from '../components/MiniKpi.jsx'
import TableShell from '../components/TableShell.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { formatTaka, formatMonthLabel, formatDate, formatPercent } from '../utils/formatters.js'
import { toMonthKey, getMonthCategoryBreakdown } from '../utils/computations.js'
import { COLORS } from '../constants.js'

export default function Monthly({ rows, summary }) {
  const { monthlySummary } = summary
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    if (!monthlySummary.length) return
    if (!selectedMonth || !monthlySummary.some(m => m.month === selectedMonth)) {
      setSelectedMonth(monthlySummary[monthlySummary.length - 1].month)
    }
  }, [monthlySummary, selectedMonth])

  const sel = useMemo(() =>
    monthlySummary.find(m => m.month === selectedMonth) || monthlySummary[monthlySummary.length - 1] || { month: '', income: 0, expense: 0 },
    [monthlySummary, selectedMonth])

  const selTxns = useMemo(() =>
    rows.filter(r => toMonthKey(r.date) === sel.month).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rows, sel])

  const catBreakdown = useMemo(() => getMonthCategoryBreakdown(rows, sel.month), [rows, sel])

  // ---- day-by-day comparison for selected month ----
  const dayByDay = useMemo(() => {
    const map = {}
    selTxns.forEach(r => {
      if (!map[r.date]) map[r.date] = { date: r.date, income: 0, expense: 0 }
      map[r.date][r.type] += r.amount
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [selTxns])

  // ---- health metrics ----
  const budgetPct = sel.income > 0 ? (sel.expense / sel.income) * 100 : 0
  const savingsTarget = sel.income * 0.2
  const actualSavings = sel.income - sel.expense
  const savingsPct = savingsTarget > 0 ? (actualSavings / savingsTarget) * 100 : 0
  const burnRate = sel.income > 0 ? (sel.expense / sel.income) : 0

  // ---- category donut-like mini bars ----
  const maxCat = Math.max(...catBreakdown.map(c => c.amount), 1)

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Month selector + KPIs ── */}
      <ChartShell
        title="Monthly Finance Review"
        subtitle="Select a month to inspect daily activity"
        action={
          <select
            value={sel.month}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ border: '1px solid #dfe6ea', borderRadius: 10, padding: '10px 14px', fontSize: 14, minWidth: 200, background: '#fff', color: '#233241', cursor: 'pointer' }}
          >
            {monthlySummary.map(m => (
              <option key={m.month} value={m.month}>{formatMonthLabel(m.month)}</option>
            ))}
          </select>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <MiniKpi label="Income" value={formatTaka(sel.income)} color={COLORS.income} />
          <MiniKpi label="Expense" value={formatTaka(sel.expense)} color={COLORS.expense} />
          <MiniKpi label="Balance" value={formatTaka(sel.income - sel.expense)} color={sel.income - sel.expense >= 0 ? COLORS.balance : COLORS.expense} />
          <MiniKpi label="Transactions" value={selTxns.length} color={COLORS.accent} />
        </div>

        {/* ── Day-by-Day Comparison Chart ── */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#213143', marginBottom: 10 }}>
          Day-by-Day Activity — {formatMonthLabel(sel.month)}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={dayByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8898aa' }} tickFormatter={d => d.slice(-2)} />
            <YAxis tick={{ fontSize: 11, fill: '#8898aa' }} tickFormatter={v => '৳' + (v/1000).toFixed(0) + 'k'} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              formatter={v => formatTaka(v)}
              labelFormatter={l => `Date: ${l}`}
            />
            <Legend />
            <Bar dataKey="income" fill={COLORS.income} radius={[4, 4, 0, 0]} name="Income" barSize={16} />
            <Bar dataKey="expense" fill={COLORS.expense} radius={[4, 4, 0, 0]} name="Expense" barSize={16} />
            <Line type="monotone" dataKey="income" stroke={COLORS.income} strokeWidth={2} dot={false} name="Income Trend" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* ── Category mini-bars (inventive, no table) ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#213143', marginBottom: 12 }}>
            Category Breakdown — {formatMonthLabel(sel.month)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {catBreakdown.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #eef2f5'
              }}>
                <StatusDot type={c.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#344150' }}>{c.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.type === 'income' ? COLORS.income : COLORS.expense }}>
                      {formatTaka(c.amount)}
                    </span>
                  </div>
                  <ProgressBar value={c.amount} max={maxCat} color={c.type === 'income' ? COLORS.income : COLORS.expense} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartShell>

      {/* ── Row 2: Health Check (visual, no plain text) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        <ChartShell title="Budget Health" subtitle="Expense vs Income ratio">
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#5f6b7a' }}>Budget Used</span>
                <span style={{ fontWeight: 700, color: budgetPct > 100 ? COLORS.expense : '#344150' }}>
                  {formatPercent(budgetPct)}
                </span>
              </div>
              <ProgressBar value={sel.expense} max={sel.income} color={budgetPct > 100 ? COLORS.expense : COLORS.income} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#5f6b7a' }}>Savings Target (20%)</span>
                <span style={{ fontWeight: 700, color: savingsPct >= 100 ? COLORS.income : COLORS.warning }}>
                  {formatPercent(savingsPct)}
                </span>
              </div>
              <ProgressBar value={actualSavings} max={savingsTarget} color={actualSavings >= savingsTarget ? COLORS.income : COLORS.warning} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderRadius: 10, background: burnRate <= 0.8 ? '#e8f5e9' : burnRate <= 1 ? '#fff3e0' : '#ffebee'
            }}>
              <span style={{ fontSize: 22 }}>
                {burnRate <= 0.8 ? '✅' : burnRate <= 1 ? '⚠️' : '🚨'}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#344150' }}>
                  {burnRate <= 0.8 ? 'Healthy Budget' : burnRate <= 1 ? 'Tight Budget' : 'Over Budget'}
                </div>
                <div style={{ fontSize: 12, color: '#8898aa', marginTop: 2 }}>
                  Burn rate: {formatPercent(burnRate * 100)}
                </div>
              </div>
            </div>
          </div>
        </ChartShell>

        <ChartShell title="Month Snapshot" subtitle="Quick numbers at a glance">
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { label: 'Income per Transaction', value: selTxns.filter(r => r.type === 'income').length ? formatTaka(sel.income / selTxns.filter(r => r.type === 'income').length) : '৳0' },
              { label: 'Expense per Transaction', value: selTxns.filter(r => r.type === 'expense').length ? formatTaka(sel.expense / selTxns.filter(r => r.type === 'expense').length) : '৳0' },
              { label: 'Largest Single Entry', value: formatTaka(selTxns.length ? Math.max(...selTxns.map(r => r.amount)) : 0) },
              { label: 'Active Categories', value: catBreakdown.length },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #eef2f5' : 'none' }}>
                <span style={{ color: '#5f6b7a', fontSize: 14 }}>{item.label}</span>
                <strong style={{ color: '#213143', fontSize: 15 }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </ChartShell>

      </div>

      {/* ── Row 3: Transaction Table ── */}
      <ChartShell title={`Transactions — ${formatMonthLabel(sel.month)}`} subtitle="All entries for selected month">
        <TableShell
          data={selTxns}
          columns={[
            { header: 'Date', key: 'date', width: '120px', render: r => formatDate(r.date) },
            { header: 'Type', key: 'type', render: r => <StatusDot type={r.type} /> },
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount', align: 'right',
              render: r => <strong style={{ color: r.type === 'income' ? COLORS.income : COLORS.expense }}>{formatTaka(r.amount)}</strong> },
            { header: 'Note', key: 'note' },
          ]}
          emptyText="No transactions found for this month."
        />
      </ChartShell>

    </div>
  )
}
