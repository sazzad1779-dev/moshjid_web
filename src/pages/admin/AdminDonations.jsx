import React, { useState } from 'react'
import { CalendarDays, CircleDollarSign, Search, Users, Wallet } from 'lucide-react'
import useAdminResource from '../../hooks/useAdminResource.js'
import { formatTaka } from '../../utils/formatters.js'
import { EmptyState, PageTitle, Pagination, StatCard } from './AdminShared.jsx'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AdminDonations() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, status, error, refetch } = useAdminResource('dues-matrix', { year, page, pageSize: 25, search })
  const [selectedMember, setSelectedMember] = useState(null)
  const [generateStatus, setGenerateStatus] = useState('idle')
  const [generateError, setGenerateError] = useState('')
  const [generateResult, setGenerateResult] = useState(null)

  const members = data?.members || []
  const monthNames = data?.monthNames || MONTH_NAMES
  const pageCount = data?.pageCount || 1

  const changeYear = event => {
    setYear(event.target.value)
    setPage(1)
    setSelectedMember(null)
  }

  const changeSearch = event => {
    setSearch(event.target.value)
    setPage(1)
  }

  const generateDues = async () => {
    setGenerateStatus('saving')
    setGenerateError('')
    setGenerateResult(null)
    try {
      const response = await fetch(`/api/admin-data?resource=dues&year=${encodeURIComponent(year)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      setGenerateResult(result)
      setGenerateStatus('ready')
      refetch()
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate monthly dues.')
      setGenerateStatus('error')
    }
  }

  const dueMonths = selectedMember
    ? Object.values(selectedMember.months)
        .filter(month => month.status !== 'paid' && month.status !== 'waived')
        .map(month => MONTH_NAMES[month.month - 1])
    : []
  const memberMonths = selectedMember
    ? Object.values(selectedMember.months).sort((a, b) => a.month - b.month)
    : []

  return (
    <>
      <PageTitle eyebrow="Contributions" title="Monthly dues" description="A complete member-by-member view of dues and payments." />
      {status === 'loading' && <div className="admin-data-status" role="status">Loading monthly dues…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>Could not load monthly dues: {error || 'Unknown error'}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <>
          <div className="admin-stat-grid">
            <StatCard label="Members" value={data.summary.memberCount} note={year} icon={Users} tone="blue" />
            <StatCard label="Total due" value={formatTaka(data.summary.totalDue)} note={year} icon={CalendarDays} tone="purple" />
            <StatCard label="Total paid" value={formatTaka(data.summary.totalPaid)} note={year} icon={CircleDollarSign} tone="green" />
            <StatCard label="Outstanding" value={formatTaka(data.summary.balance)} note={year} icon={Wallet} tone="amber" />
          </div>
          <section className="admin-panel">
            <div className="admin-panel-heading admin-donation-heading">
              <div><h2>Monthly dues sheet</h2><p>Showing {members.length ? (page - 1) * data.pageSize + 1 : 0}–{Math.min(page * data.pageSize, data.total)} of {data.total} members · select a member for a full breakdown</p></div>
              <div className="admin-donation-filters">
                <label className="admin-select-label">Year<select value={year} onChange={changeYear}>{Array.from({ length: 7 }, (_, index) => String(new Date().getFullYear() - index)).map(option => <option key={option}>{option}</option>)}</select></label>
                <button type="button" className="admin-button admin-button--primary" onClick={generateDues} disabled={generateStatus === 'saving'}>{generateStatus === 'saving' ? 'Generating…' : 'Generate dues'}</button>
              </div>
            </div>
            {generateError && <div className="admin-data-status admin-data-status--error" role="alert">{generateError}</div>}
            {generateResult && <div className="admin-data-status" role="status">Generated {generateResult.generated} dues, linked {generateResult.linked} transactions for {generateResult.year}.</div>}

            <div className="admin-donation-toolbar">
              <label className="admin-search">
                <Search size={16} aria-hidden="true" />
                <input type="search" value={search} onChange={changeSearch} maxLength={100} placeholder="Search name, member code, or phone" aria-label="Search members" />
              </label>
              <span className="admin-donation-hint">Green: paid · Amber: partial · Red: unpaid · Grey: no due record</span>
            </div>

            {selectedMember && (
              <div className="admin-dialog-backdrop" onMouseDown={event => {
                if (event.target === event.currentTarget) setSelectedMember(null)
              }}>
                <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true">
                  <div className="admin-dialog-header">
                    <div><h2>Member dues</h2><p className="admin-mono">{selectedMember.memberName} · {year}</p></div>
                    <button type="button" className="admin-icon-button" aria-label="Close" onClick={() => setSelectedMember(null)}>×</button>
                  </div>
                  <div className="admin-dues-member-meta">
                    <span>{selectedMember.phone || 'No phone number'}</span>
                    <span>{selectedMember.email || 'No email address'}</span>
                    <span>Monthly amount: {selectedMember.monthlyAmount === null ? '—' : formatTaka(selectedMember.monthlyAmount)}</span>
                    <span>Last payment: {selectedMember.lastPaymentDate || '—'}</span>
                  </div>
                  <div className="admin-dues-detail-stats">
                    <div><span>Total due</span><strong>{formatTaka(selectedMember.totalDue)}</strong></div>
                    <div><span>Total paid</span><strong className="is-paid">{formatTaka(selectedMember.totalPaid)}</strong></div>
                    <div><span>Balance</span><strong className="is-balance">{formatTaka(selectedMember.balance)}</strong></div>
                  </div>
                  <div className="admin-dues-detail-heading"><strong>Monthly breakdown</strong><span>{dueMonths.length ? `${dueMonths.length} month${dueMonths.length === 1 ? '' : 's'} outstanding` : 'No outstanding months'}</span></div>
                  {memberMonths.length ? (
                    <div className="admin-table-scroll">
                      <table className="admin-table admin-dues-detail-table">
                        <thead><tr><th>Month</th><th>Status</th><th className="admin-align-right">Due</th><th className="admin-align-right">Paid</th><th className="admin-align-right">Balance</th></tr></thead>
                        <tbody>{memberMonths.map(month => (
                          <tr key={month.month}>
                            <td>{monthNames[month.month - 1]}</td>
                            <td><span className={`admin-status admin-status--${month.status}`}>{month.status}</span>{month.status === 'waived' && month.waivedReason && <small className="admin-mono admin-waived-reason">{month.waivedReason}</small>}</td>
                            <td className="admin-align-right">{formatTaka(month.amountDue)}</td>
                            <td className="admin-align-right admin-paid-amount">{formatTaka(month.amountPaid)}</td>
                            <td className="admin-align-right">{month.status === 'waived' || month.status === 'paid' ? formatTaka(0) : formatTaka(Math.max(0, month.amountDue - month.amountPaid))}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <EmptyState icon={CalendarDays} title="No monthly records" description="No dues have been generated for this member and year yet." />}
                </section>
              </div>
            )}

            {members.length ? (
              <>
                <div className="admin-table-scroll">
                  <table className="admin-table admin-donation-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        {monthNames.map(name => <th key={name} title={name}>{name.slice(0,3)}</th>)}
                        <th className="admin-align-right">Balance</th>
                        <th className="admin-align-right">Total paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.memberId}>
                          <td>
                            <button type="button" className="admin-dues-member-link" onClick={() => setSelectedMember(member)} aria-label={`View dues for ${member.memberName}`}>
                              <span className="admin-avatar">{member.memberName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>
                              <span><strong>{member.memberName}</strong><small className="admin-mono">{member.memberCode || member.memberId}</small></span>
                            </button>
                          </td>
                          {monthNames.map((name, index) => {
                            const monthNumber = index + 1
                            const monthData = member.months[monthNumber]
                            const balance = monthData && monthData.status !== 'paid' && monthData.status !== 'waived'
                              ? Math.max(0, monthData.amountDue - monthData.amountPaid)
                              : 0
                            return (
                              <td key={name} className="admin-dues-month-cell">
                                {monthData ? (
                                  <div className="admin-dues-month-content" title={`${name}: ${monthData.status}, due ${formatTaka(monthData.amountDue)}, paid ${formatTaka(monthData.amountPaid)}${monthData.dueDate ? `, due date ${monthData.dueDate}` : ''}`}>
                                    <span className={`admin-status admin-status--${monthData.status}`}>{monthData.status}</span>
                                    <small>{monthData.status === 'waived' ? 'Waived' : monthData.status === 'paid' ? formatTaka(monthData.amountPaid) : `${formatTaka(balance)} left`}</small>
                                  </div>
                                ) : <span className="admin-dues-no-record" title={`No ${name} due record`}>—</span>}
                              </td>
                            )
                          })}
                          <td className="admin-align-right admin-dues-balance">{formatTaka(member.balance)}</td>
                          <td className="admin-align-right admin-paid-amount">{formatTaka(member.totalPaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
              </>
            ) : <EmptyState icon={CalendarDays} title={search ? 'No matching members' : 'No members found'} description={search ? 'Try another name, member code, or phone number.' : `There are no active members or recorded dues for ${year}.`} />}
          </section>
        </>
      )}
    </>
  )
}
