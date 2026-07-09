import React, { useMemo } from 'react'
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import Kpi from '../components/Kpi.jsx'
import ChartShell from '../components/ChartShell.jsx'
import TableShell from '../components/TableShell.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { formatTaka, formatDate } from '../utils/formatters.js'
import { COLORS } from '../constants.js'

export default function Home({ rows, summary }) {
  const { totalIncome, totalExpense, balance, monthlySummary } = summary

  const monthlyTrend = useMemo(() =>
    monthlySummary.map(m => ({ ...m, balance: m.income - m.expense })),
    [monthlySummary])

  const recent = useMemo(() =>
    [...rows].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
    [rows])

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Kpi label="Total Income" value={formatTaka(totalIncome)} color={COLORS.income} icon="💰" />
        <Kpi label="Total Expense" value={formatTaka(totalExpense)} color={COLORS.expense} icon="💸" />
        <Kpi label="Net Balance" value={formatTaka(balance)} color={balance >= 0 ? COLORS.balance : COLORS.expense} icon="⚖️" />
        <Kpi label="Transactions" value={rows.length} color={COLORS.accent} icon="📑" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 20 }}>
        <ChartShell title="Monthly Financial Trend" subtitle="Income vs Expense vs Balance over time">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.balance} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS.balance} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8898aa' }} />
              <YAxis tick={{ fontSize: 12, fill: '#8898aa' }} tickFormatter={v => '৳' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} formatter={v => formatTaka(v)} />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Area type="monotone" dataKey="balance" fill="url(#bg)" stroke={COLORS.balance} strokeWidth={2} name="Balance" />
              <Bar dataKey="income" fill={COLORS.income} radius={[6, 6, 0, 0]} name="Income" barSize={30} />
              <Line type="monotone" dataKey="expense" stroke={COLORS.expense} strokeWidth={3} dot={{ r: 4 }} name="Expense" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Quick Stats">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5f6b7a', fontSize: 14 }}>Income Records</span>
              <strong style={{ color: COLORS.income, fontSize: 18 }}>{rows.filter(r => r.type === 'income').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5f6b7a', fontSize: 14 }}>Expense Records</span>
              <strong style={{ color: COLORS.expense, fontSize: 18 }}>{rows.filter(r => r.type === 'expense').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5f6b7a', fontSize: 14 }}>Avg Income/Month</span>
              <strong style={{ color: COLORS.balance, fontSize: 16 }}>{formatTaka(totalIncome / (monthlySummary.length || 1))}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5f6b7a', fontSize: 14 }}>Avg Expense/Month</span>
              <strong style={{ color: COLORS.expense, fontSize: 16 }}>{formatTaka(totalExpense / (monthlySummary.length || 1))}</strong>
            </div>
            <div style={{ paddingTop: 10, borderTop: '1px solid #eef2f5' }}>
              <div style={{ fontSize: 12, color: '#8898aa', marginBottom: 6 }}>Overall Savings Rate</div>
              <ProgressBar value={Math.max(0, savingsRate)} max={100} color={savingsRate >= 0 ? COLORS.income : COLORS.expense} />
            </div>
          </div>
        </ChartShell>
      </div>

      <ChartShell title="Recent Transactions" subtitle="Latest 10 financial activities">
        <TableShell
          data={recent}
          columns={[
            { header: 'Date', key: 'date', width: '120px', render: r => formatDate(r.date) },
            { header: 'Type', key: 'type', render: r => <StatusDot type={r.type} /> },
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount', align: 'right',
              render: r => <strong style={{ color: r.type === 'income' ? COLORS.income : COLORS.expense }}>{formatTaka(r.amount)}</strong> },
            { header: 'Note', key: 'note' },
          ]}
        />
      </ChartShell>

    </div>
  )
}
