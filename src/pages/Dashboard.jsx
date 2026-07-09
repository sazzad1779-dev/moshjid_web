import React, { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Area, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import Kpi from '../components/Kpi.jsx'
import ChartShell from '../components/ChartShell.jsx'
import TableShell from '../components/TableShell.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { formatTaka, formatPercent } from '../utils/formatters.js'
import { COLORS } from '../constants.js'

const PALETTE = COLORS.palette

export default function Dashboard({ rows, summary }) {
  const { totalIncome, totalExpense, balance, categoryBreakdown, monthlySummary } = summary

  // ---- derived data ----
  const expenseByCat = useMemo(() =>
    categoryBreakdown.filter(c => c.type === 'expense').sort((a, b) => b.amount - a.amount),
    [categoryBreakdown])

  const incomeByCat = useMemo(() =>
    categoryBreakdown.filter(c => c.type === 'income').sort((a, b) => b.amount - a.amount),
    [categoryBreakdown])

  const radarData = useMemo(() => {
    const cats = [...new Set(categoryBreakdown.map(c => c.category))]
    return cats.map(cat => ({
      category: cat,
      income: categoryBreakdown.find(c => c.type === 'income' && c.category === cat)?.amount || 0,
      expense: categoryBreakdown.find(c => c.type === 'expense' && c.category === cat)?.amount || 0,
    }))
  }, [categoryBreakdown])

  const monthlyTrend = useMemo(() =>
    monthlySummary.map(m => ({ ...m, balance: m.income - m.expense })),
    [monthlySummary])

  const allCats = [...new Set(rows.map(r => r.category))].sort()

  // ---- helpers ----
  const pctOf = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'

  const tableColumns = [
    { header: 'Type', render: r => <StatusDot type={r.type} /> },
    { header: 'Category', key: 'category' },
    { header: 'Amount', key: 'amount', align: 'right',
      render: r => <strong style={{ color: r.type === 'income' ? COLORS.income : COLORS.expense }}>{formatTaka(r.amount)}</strong> },
    { header: '% of Total', align: 'right',
      render: r => {
        const t = r.type === 'income' ? totalIncome : totalExpense
        return <span style={{ color: '#8898aa' }}>{pctOf(r.amount, t)}%</span>
      }},
    { header: 'Share', render: r => {
      const t = r.type === 'income' ? totalIncome : totalExpense
      return <ProgressBar value={r.amount} max={t} color={r.type === 'income' ? COLORS.income : COLORS.expense} />
    }},
  ]

  const catSummary = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!map[r.category]) map[r.category] = { category: r.category, income: 0, expense: 0, count: 0 }
      map[r.category][r.type] += r.amount
      map[r.category].count += 1
    })
    return Object.values(map).sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
  }, [rows])

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Kpi label="Total Income" value={formatTaka(totalIncome)} color={COLORS.income} icon="💰" />
        <Kpi label="Total Expense" value={formatTaka(totalExpense)} color={COLORS.expense} icon="💸" />
        <Kpi label="Available Balance" value={formatTaka(balance)} color={balance >= 0 ? COLORS.balance : COLORS.expense} icon="🏦" />
        <Kpi label="Active Categories" value={allCats.length} color={COLORS.accent} icon="🏷️" />
        <Kpi label="Transactions" value={rows.length} color="#455A64" icon="📑" />
      </div>

      {/* ── Row 2: Trend + Radar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 20 }}>
        <ChartShell title="Monthly Trend" subtitle="Income, expense & balance over time">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.balance} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={COLORS.balance} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8898aa' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8898aa' }} tickFormatter={v => '৳' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} formatter={v => formatTaka(v)} />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Area type="monotone" dataKey="balance" fill="url(#balGrad)" stroke={COLORS.balance} strokeWidth={2} name="Balance" />
              <Bar dataKey="income" fill={COLORS.income} radius={[6, 6, 0, 0]} name="Income" barSize={28} />
              <Line type="monotone" dataKey="expense" stroke={COLORS.expense} strokeWidth={2.5} dot={{ r: 3 }} name="Expense" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Category Radar" subtitle="Income vs Expense by category">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e0e4e8" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#5f6b7a' }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: '#8898aa' }} tickFormatter={v => '৳' + (v/1000).toFixed(0) + 'k'} />
              <Radar name="Income" dataKey="income" stroke={COLORS.income} fill={COLORS.income} fillOpacity={0.25} />
              <Radar name="Expense" dataKey="expense" stroke={COLORS.expense} fill={COLORS.expense} fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip formatter={v => formatTaka(v)} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* ── Row 3: Dual Pie Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartShell title="Expense Breakdown" subtitle="By category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={expenseByCat} dataKey="amount" nameKey="category" outerRadius={90} innerRadius={55}
                paddingAngle={3} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                {expenseByCat.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={2} />)}
              </Pie>
              <Tooltip formatter={v => formatTaka(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Income Breakdown" subtitle="By category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={incomeByCat} dataKey="amount" nameKey="category" outerRadius={90} innerRadius={55}
                paddingAngle={3} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                {incomeByCat.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={2} />)}
              </Pie>
              <Tooltip formatter={v => formatTaka(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* ── Row 4: Category Summary Table (inventive) ── */}
      <ChartShell title="Category Performance" subtitle="Income, expense & net per category">
        <TableShell
          data={catSummary}
          columns={[
            { header: 'Category', key: 'category' },
            { header: 'Income', key: 'income', align: 'right',
              render: r => <strong style={{ color: COLORS.income }}>{formatTaka(r.income)}</strong> },
            { header: 'Expense', key: 'expense', align: 'right',
              render: r => <strong style={{ color: COLORS.expense }}>{formatTaka(r.expense)}</strong> },
            { header: 'Net', align: 'right',
              render: r => {
                const net = r.income - r.expense
                return <strong style={{ color: net >= 0 ? COLORS.income : COLORS.expense }}>{formatTaka(net)}</strong>
              }},
            { header: 'Margin', align: 'right',
              render: r => {
                const net = r.income - r.expense
                const max = Math.max(r.income, r.expense)
                return <span style={{ color: '#8898aa' }}>{pctOf(net, max)}%</span>
              }},
            { header: 'Health',
              render: r => {
                const net = r.income - r.expense
                const max = Math.max(r.income, r.expense)
                const color = net > 0 ? COLORS.income : net < 0 ? COLORS.expense : '#8898aa'
                return <ProgressBar value={Math.abs(net)} max={max} color={color} label={net >= 0 ? 'Surplus' : 'Deficit'} />
              }},
          ]}
        />
      </ChartShell>

      {/* ── Row 5: Full Category Breakdown ── */}
      <ChartShell title="All Categories" subtitle="Every income & expense category with share">
        <TableShell
          data={categoryBreakdown}
          columns={tableColumns}
        />
      </ChartShell>

    </div>
  )
}
