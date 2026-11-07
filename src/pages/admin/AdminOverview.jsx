import React, { useState } from 'react'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays,
  ChevronRight, CircleDollarSign, RotateCw, Settings, Users,
} from 'lucide-react'
import useAdminResource from '../../hooks/useAdminResource.js'
import { formatTaka } from '../../utils/formatters.js'
import {
  EmptyState, PageTitle, Pagination, StatCard, TransactionTable,
} from './AdminShared.jsx'

const EMPTY_FILTERS = { q: '', type: 'all', category: 'all', from: '', to: '' }

export default function AdminOverview({ onNavigate }) {
  const [formFilters, setFormFilters] = useState(EMPTY_FILTERS)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const { data, status, error, refetch } = useAdminResource('overview', { ...filters, page })
  const updateForm = (key, value) => setFormFilters(current => ({ ...current, [key]: value }))
  const applyFilters = event => {
    event.preventDefault()
    setFilters({ ...formFilters })
    setPage(1)
  }
  const clearFilters = () => {
    setFormFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }
  const summary = data?.summary || { memberCount: 0, income: 0, expense: 0 }
  const transactions = data?.rows || []
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 5)))

  return (
    <>
      <PageTitle eyebrow="Administration" title="Overview" description="A clear picture of mosque operations and recent activity." />
      {status === 'loading' && <div className="admin-data-status" role="status">Loading overview data…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>Could not load overview data: {error || 'Unknown error'}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <>
          <div className="admin-stat-grid">
            <StatCard label="Members" value={summary.memberCount} note="Non-deleted profiles" icon={Users} tone="green" />
            <StatCard label="Total income" value={formatTaka(summary.income)} note={`${summary.count} transactions`} icon={ArrowDownLeft} tone="blue" />
            <StatCard label="Total expenses" value={formatTaka(summary.expense)} note="All non-deleted transactions" icon={ArrowUpRight} tone="amber" />
            <StatCard label="Net balance" value={formatTaka(summary.income - summary.expense)} note="Income minus expenses" icon={CircleDollarSign} tone="purple" />
          </div>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Transaction Filters</h2><p>Search recent transactions by text, type, category, or date range.</p></div>
              <button type="button" className="admin-icon-button" onClick={refetch} aria-label="Refresh overview data"><RotateCw size={17} /></button>
            </div>
            <form className="admin-overview-filters" onSubmit={applyFilters}>
              <label className="admin-search"><span className="sr-only">Search transactions</span><input value={formFilters.q} onChange={event => updateForm('q', event.target.value)} placeholder="Search description, member, or receipt..." /></label>
              <select aria-label="Filter by transaction type" value={formFilters.type} onChange={event => updateForm('type', event.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="other">Other</option></select>
              <select aria-label="Filter by category" value={formFilters.category} onChange={event => updateForm('category', event.target.value)}><option value="all">All categories</option>{(data.categories || []).map(category => <option key={category} value={category}>{category}</option>)}</select>
              <label className="admin-date-filter"><span>From</span><input aria-label="From date" type="date" value={formFilters.from} onChange={event => updateForm('from', event.target.value)} /></label>
              <label className="admin-date-filter"><span>To</span><input aria-label="To date" type="date" value={formFilters.to} onChange={event => updateForm('to', event.target.value)} /></label>
              <button type="submit" className="admin-button admin-button--primary">Apply filters</button>
              <button type="button" className="admin-button admin-button--quiet" onClick={clearFilters}>Clear</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Latest transactions</h2><p>Newest transaction dates first · {data.total} matching records</p></div>
              <button className="admin-text-button" onClick={() => onNavigate('transactions')}>View all <ChevronRight size={16} /></button>
            </div>
            {transactions.length
              ? <TransactionTable transactions={transactions} compact />
              : <EmptyState icon={ArrowLeftRight} title="No transactions found" description="There are no records matching these filters." />}
            <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </section>
          <section className="admin-quick-links">
            <button onClick={() => onNavigate('members')}><span className="admin-quick-icon"><Users size={19} /></span><span><strong>Manage members</strong><small>Review member profiles</small></span><ChevronRight size={17} /></button>
            <button onClick={() => onNavigate('donations')}><span className="admin-quick-icon"><CalendarDays size={19} /></span><span><strong>Donation history</strong><small>Track monthly contributions</small></span><ChevronRight size={17} /></button>
            <button onClick={() => onNavigate('settings')}><span className="admin-quick-icon"><Settings size={19} /></span><span><strong>Page settings</strong><small>Prayer times and announcements</small></span><ChevronRight size={17} /></button>
          </section>
        </>
      )}
    </>
  )
}
