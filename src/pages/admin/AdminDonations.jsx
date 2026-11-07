import React, { useState } from 'react'
import { CircleDollarSign, Clock3, FileText, Users } from 'lucide-react'
import { formatTaka } from '../../utils/formatters.js'
import { MONTHS, PageTitle, PreviewNotice, SAMPLE_DUES, StatCard } from './AdminShared.jsx'

export default function AdminDonations() {
  const [year, setYear] = useState('2025')
  const [monthIndex, setMonthIndex] = useState(5)
  const collected = SAMPLE_DUES.reduce((sum, member) => sum + member.amounts.slice(0, monthIndex + 1).reduce((memberSum, amount) => memberSum + amount, 0), 0)
  const collectedThisMonth = SAMPLE_DUES.reduce((sum, member) => sum + member.amounts[monthIndex], 0)
  const paidCount = SAMPLE_DUES.filter(member => member.amounts[monthIndex] > 0).length

  return (
    <>
      <PageTitle eyebrow="Contributions" title="Monthly donations" description="Member-by-member view of monthly mosque contributions." />
      <PreviewNotice>Illustrative monthly history. Live member dues and payment status will appear after the dues API is connected.</PreviewNotice>
      <div className="admin-stat-grid admin-stat-grid--three">
        <StatCard label="Collected this month" value={formatTaka(collectedThisMonth)} note={`${MONTHS[monthIndex]} ${year}`} icon={CircleDollarSign} tone="green" />
        <StatCard label="Members contributed" value={`${paidCount} / ${SAMPLE_DUES.length}`} note="Sample member records" icon={Users} tone="blue" />
        <StatCard label="Collected to date" value={formatTaka(collected)} note={`Jan–${MONTHS[monthIndex]} ${year}`} icon={FileText} tone="purple" />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading admin-donation-heading">
          <div><h2>Member contribution history</h2><p>Monthly status and amounts by member</p></div>
          <label className="admin-select-label">Year<select value={year} onChange={event => setYear(event.target.value)}><option>2025</option><option>2024</option></select></label>
        </div>
        <div className="admin-month-selector" aria-label="Choose month">{MONTHS.map((month, index) => <button key={month} className={index === monthIndex ? 'is-active' : ''} onClick={() => setMonthIndex(index)}>{month}</button>)}</div>
        <div className="admin-table-scroll">
          <table className="admin-table admin-donation-table">
            <thead><tr><th>Member</th><th>Member ID</th>{MONTHS.slice(0, monthIndex + 1).map(month => <th key={month} className="admin-align-right">{month}</th>)}<th className="admin-align-right">Year total</th></tr></thead>
            <tbody>{SAMPLE_DUES.map(member => {
              const amounts = member.amounts.slice(0, monthIndex + 1)
              const total = amounts.reduce((sum, amount) => sum + amount, 0)
              return <tr key={member.id}><td><div className="admin-member-cell"><span className="admin-avatar">{member.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{member.name}</strong></div></td><td className="admin-mono">{member.id}</td>{amounts.map((amount, index) => <td key={MONTHS[index]} className="admin-align-right">{amount ? <span className="admin-paid-amount">{formatTaka(amount)}</span> : <span className="admin-unpaid">Unpaid</span>}</td>)}<td className="admin-align-right admin-amount">{formatTaka(total)}</td></tr>
            })}</tbody>
          </table>
        </div>
        <div className="admin-table-legend"><span><i className="is-paid" />Paid</span><span><i className="is-unpaid" />Unpaid / no entry</span><span><Clock3 size={14} />Amounts shown in BDT</span></div>
      </section>
    </>
  )
}
