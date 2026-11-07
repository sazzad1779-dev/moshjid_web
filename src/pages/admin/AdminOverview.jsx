import React from 'react'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays,
  ChevronRight, CircleDollarSign, Settings, Users,
} from 'lucide-react'
import { formatTaka } from '../../utils/formatters.js'
import {
  EmptyState, PageTitle, PreviewNotice, StatCard, TransactionTable,
} from './AdminShared.jsx'

export default function AdminOverview({ members, transactions, onNavigate }) {
  const totalIncome = transactions.reduce((sum, item) => sum + (item.type === 'income' ? Number(item.amount) : 0), 0)
  const totalExpense = transactions.reduce((sum, item) => sum + (item.type === 'expense' ? Number(item.amount) : 0), 0)
  const recent = transactions.slice(0, 5)

  return (
    <>
      <PageTitle eyebrow="Administration" title="Overview" description="A clear picture of mosque operations and recent activity." />
      <PreviewNotice>Member counts and dues below are illustrative until the profile and monthly dues APIs are connected.</PreviewNotice>
      <div className="admin-stat-grid">
        <StatCard label="Members" value={members.length} note="Sample profiles" icon={Users} tone="green" />
        <StatCard label="Total income" value={formatTaka(totalIncome)} note={`${transactions.length} transactions loaded`} icon={ArrowDownLeft} tone="blue" />
        <StatCard label="Total expenses" value={formatTaka(totalExpense)} note="From available transactions" icon={ArrowUpRight} tone="amber" />
        <StatCard label="Net balance" value={formatTaka(totalIncome - totalExpense)} note="Income minus expenses" icon={CircleDollarSign} tone="purple" />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><h2>Recent transactions</h2><p>Latest activity from the available transaction feed</p></div>
          <button className="admin-text-button" onClick={() => onNavigate('transactions')}>View all <ChevronRight size={16} /></button>
        </div>
        {recent.length
          ? <TransactionTable transactions={recent} compact />
          : <EmptyState icon={ArrowLeftRight} title="No transactions to show" description="Transaction activity will appear here once available." />}
      </section>
      <section className="admin-quick-links">
        <button onClick={() => onNavigate('members')}><span className="admin-quick-icon"><Users size={19} /></span><span><strong>Manage members</strong><small>Review member profiles</small></span><ChevronRight size={17} /></button>
        <button onClick={() => onNavigate('donations')}><span className="admin-quick-icon"><CalendarDays size={19} /></span><span><strong>Donation history</strong><small>Track monthly contributions</small></span><ChevronRight size={17} /></button>
        <button onClick={() => onNavigate('settings')}><span className="admin-quick-icon"><Settings size={19} /></span><span><strong>Page settings</strong><small>Prayer times and announcements</small></span><ChevronRight size={17} /></button>
      </section>
    </>
  )
}
