import React, { useEffect, useState } from 'react'
import { CalendarDays, CircleDollarSign, Clock3, FileText, Users } from 'lucide-react'
import useAdminResource from '../../hooks/useAdminResource.js'
import { formatDate, formatTaka } from '../../utils/formatters.js'
import { EmptyState, MONTHS, PageTitle, Pagination, StatCard } from './AdminShared.jsx'

const MONTH_OPTIONS = [
  ['0', 'All months'],
  ...MONTHS.map((name, index) => [String(index + 1), name]),
]

export default function AdminDonations() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState('0')
  const [page, setPage] = useState(1)
  const { data, status, error, refetch } = useAdminResource('dues', { year, month, page, pageSize: 10 })
  const dues = data?.rows || []
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 10)))

  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount])

  const changeYear = event => {
    setYear(event.target.value)
    setPage(1)
  }
  const changeMonth = event => {
    setMonth(event.target.value)
    setPage(1)
  }
  const selectedMonth = Number(month)
  const periodLabel = selectedMonth ? `${MONTH_OPTIONS.find(([value]) => value === month)?.[1]} ${year}` : year

  return (
    <>
      <PageTitle eyebrow="Contributions" title="Monthly donations" description="Monthly dues joined with each member profile in the database." />
      {status === 'loading' && <div className="admin-data-status" role="status">Loading monthly dues…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>Could not load monthly dues: {error || 'Unknown error'}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <>
          <div className="admin-stat-grid admin-stat-grid--three">
            <StatCard label="Amount paid" value={formatTaka(data.summary.amountPaid)} note={periodLabel} icon={CircleDollarSign} tone="green" />
            <StatCard label="Dues records" value={data.summary.count} note="Records in selected period" icon={Users} tone="blue" />
            <StatCard label="Amount due" value={formatTaka(data.summary.amountDue)} note={`For ${periodLabel}`} icon={FileText} tone="purple" />
          </div>
          <section className="admin-panel">
            <div className="admin-panel-heading admin-donation-heading">
              <div><h2>Member contribution history</h2><p>Monthly dues joined to profiles by member ID</p></div>
              <div className="admin-donation-filters">
                <label className="admin-select-label">Year<select value={year} onChange={changeYear}>{Array.from({ length: 7 }, (_, index) => String(new Date().getFullYear() - index)).map(option => <option key={option}>{option}</option>)}</select></label>
                <label className="admin-select-label">Month<select value={month} onChange={changeMonth}>{MONTH_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
            </div>
            {dues.length ? (
              <div className="admin-table-scroll">
                <table className="admin-table admin-donation-table">
                  <thead><tr><th>Member</th><th>Period</th><th>Due date</th><th className="admin-align-right">Amount due</th><th className="admin-align-right">Paid</th><th>Status</th></tr></thead>
                  <tbody>{dues.map(due => (
                    <tr key={due.id}>
                      <td><div className="admin-member-cell"><span className="admin-avatar">{due.member_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{due.member_name}</strong></div><small className="admin-mono">{due.member_code || due.member_id}</small></td>
                      <td>{formatDate(due.period)}</td><td>{formatDate(due.due_date)}</td>
                      <td className="admin-align-right admin-amount">{formatTaka(due.amount_due)}</td><td className="admin-align-right admin-paid-amount">{formatTaka(due.amount_paid)}</td>
                      <td><span className={`admin-status admin-status--${due.status}`}>{due.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <EmptyState icon={CalendarDays} title="No monthly dues yet" description={`There are no monthly dues for ${periodLabel}. Records will appear here after dues are added and linked to member profiles.`} />}
            <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            <div className="admin-table-legend"><span><Clock3 size={14} />Dues are linked to profiles by member_id and period.</span></div>
          </section>
        </>
      )}
    </>
  )
}
