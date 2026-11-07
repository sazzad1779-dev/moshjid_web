import React, { useState } from 'react'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, Check, ChevronLeft,
  ChevronRight, Pencil, Trash2, X,
} from 'lucide-react'
import { formatDate, formatTaka } from '../../utils/formatters.js'

export const SAMPLE_MEMBERS = [
  { id: 'MB-001', fullName: 'Abdul Karim', phone: '01712-345678', area: 'Beparipara', status: 'Active', joinedAt: '2022-01-15' },
  { id: 'MB-002', fullName: 'Mohammad Rahman', phone: '01819-234567', area: 'West Para', status: 'Active', joinedAt: '2022-03-08' },
  { id: 'MB-003', fullName: 'Abdul Hannan', phone: '01911-456789', area: 'Beparipara', status: 'Active', joinedAt: '2022-06-22' },
  { id: 'MB-004', fullName: 'Mizanur Rahman', phone: '01672-987654', area: 'North Para', status: 'Inactive', joinedAt: '2023-02-11' },
  { id: 'MB-005', fullName: 'Nurul Islam', phone: '01755-112233', area: 'West Para', status: 'Active', joinedAt: '2023-08-03' },
  { id: 'MB-006', fullName: 'Abu Bakar Siddique', phone: '01844-667788', area: 'South Para', status: 'Active', joinedAt: '2024-01-19' },
]

export const SAMPLE_DUES = [
  { id: 'MB-001', name: 'Abdul Karim', amounts: [500, 500, 500, 500, 500, 500] },
  { id: 'MB-002', name: 'Mohammad Rahman', amounts: [500, 500, 0, 500, 500, 500] },
  { id: 'MB-003', name: 'Abdul Hannan', amounts: [500, 500, 500, 0, 500, 500] },
  { id: 'MB-004', name: 'Mizanur Rahman', amounts: [0, 0, 500, 500, 500, 0] },
  { id: 'MB-005', name: 'Nurul Islam', amounts: [500, 500, 500, 500, 500, 500] },
  { id: 'MB-006', name: 'Abu Bakar Siddique', amounts: [500, 0, 500, 500, 500, 500] },
]

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
export const INITIAL_SETTINGS = {
  fajr: '04:45', dhuhr: '13:15', asr: '16:30', maghrib: '18:05', isha: '19:30',
  welcomeText: 'Welcome to our mosque community.',
  announcement: 'Jummah prayer will be held at 1:30 PM this Friday.',
}
export const PAGE_SIZE = 8

export function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="admin-page-title">
      <div>
        <div className="admin-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function PreviewNotice({ children = 'Preview data — connect the member and dues APIs to use live records.' }) {
  return <div className="admin-preview-notice"><Bell size={15} aria-hidden="true" />{children}</div>
}

export function TransactionDataStatus({ status, error, count, onRetry }) {
  if (status === 'loading' && count === 0) {
    return <div className="admin-data-status" role="status">Loading transaction data…</div>
  }

  if (status === 'error') {
    return (
      <div className="admin-data-status admin-data-status--error" role="alert">
        <span>Could not load transaction data: {error || 'Unknown error'}</span>
        <button type="button" className="admin-button admin-button--quiet" onClick={onRetry}>Retry</button>
      </div>
    )
  }

  if (status === 'ready' && count === 0) {
    return <div className="admin-data-status" role="status">No transaction records were returned by the API.</div>
  }

  return null
}

export function StatCard({ label, value, note, icon: Icon, tone }) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-icon admin-stat-icon--${tone}`}><Icon size={19} aria-hidden="true" /></div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-note">{note}</div>
    </article>
  )
}

export function StatusBadge({ status }) {
  return <span className={`admin-status admin-status--${status.toLowerCase()}`}>{status}</span>
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="admin-empty-state">
      <span><Icon size={24} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

export function MemberDialog({ member, onClose, onSave }) {
  const [form, setForm] = useState(member || { fullName: '', phone: '', area: '', status: 'Active' })
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = event => {
    event.preventDefault()
    onSave({ ...form, id: member?.id || `MB-${String(Date.now()).slice(-5)}`, joinedAt: member?.joinedAt || new Date().toISOString().slice(0, 10) })
  }

  return (
    <div className="admin-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
        <div className="admin-dialog-header">
          <div><span className="admin-eyebrow">Member profile</span><h2 id="member-dialog-title">{member ? 'Edit member' : 'Add a member'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>
        <form className="admin-form" onSubmit={submit}>
          <label>Full name<input required value={form.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Member name" /></label>
          <label>Phone number<input value={form.phone} onChange={event => update('phone', event.target.value)} placeholder="01XXXXXXXXX" /></label>
          <label>Area / address<input value={form.area} onChange={event => update('area', event.target.value)} placeholder="Neighborhood" /></label>
          <label>Status<select value={form.status} onChange={event => update('status', event.target.value)}><option>Active</option><option>Inactive</option></select></label>
          <div className="admin-dialog-actions"><button className="admin-button admin-button--quiet" type="button" onClick={onClose}>Cancel</button><button className="admin-button admin-button--primary" type="submit"><Check size={16} />Save member</button></div>
        </form>
      </section>
    </div>
  )
}

export function TransactionDialog({ transaction, onClose, onSave }) {
  const [form, setForm] = useState({
    date: transaction.date || '',
    category: transaction.category || '',
    amount: transaction.amount || '',
    note: transaction.note || '',
  })
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = event => {
    event.preventDefault()
    onSave({ ...transaction, ...form, amount: Number(form.amount) })
  }

  return (
    <div className="admin-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
        <div className="admin-dialog-header">
          <div><span className="admin-eyebrow">Transaction details</span><h2 id="transaction-dialog-title">Edit transaction</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>
        <form className="admin-form" onSubmit={submit}>
          <label>Date<input required type="date" value={form.date} onChange={event => update('date', event.target.value)} /></label>
          <label>Category<input required value={form.category} onChange={event => update('category', event.target.value)} /></label>
          <label>Amount (BDT)<input required type="number" min="1" value={form.amount} onChange={event => update('amount', event.target.value)} /></label>
          <label>Description<input value={form.note} onChange={event => update('note', event.target.value)} /></label>
          <div className="admin-dialog-actions"><button className="admin-button admin-button--quiet" type="button" onClick={onClose}>Cancel</button><button className="admin-button admin-button--primary" type="submit"><Check size={16} />Save changes</button></div>
        </form>
      </section>
    </div>
  )
}

export function TransactionTable({ transactions, onEdit, onDelete, compact = false }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th className="admin-align-right">Amount</th>{!compact && <th><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>{transactions.map((transaction, index) => (
          <tr key={transaction.id || `${transaction.date}-${index}`}>
            <td className="admin-nowrap">{formatDate(transaction.date)}</td>
            <td><div className="admin-description">{transaction.note || '—'}</div>{transaction.id && <small className="admin-mono">#{transaction.id}</small>}</td>
            <td>{transaction.category || 'Uncategorized'}</td>
            <td><span className={`admin-type admin-type--${transaction.type || 'other'}`}>{transaction.type === 'income' ? <ArrowDownLeft size={14} /> : transaction.type === 'expense' ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}{transaction.type || 'other'}</span></td>
            <td className={`admin-align-right admin-amount ${transaction.type === 'income' ? 'is-income' : transaction.type === 'expense' ? 'is-expense' : ''}`}>{formatTaka(transaction.amount)}</td>
            {!compact && <td><div className="admin-row-actions"><button className="admin-icon-button" aria-label="Edit transaction" onClick={() => onEdit(transaction, index)}><Pencil size={16} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label="Delete transaction" onClick={() => onDelete(transaction, index)}><Trash2 size={16} /></button></div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pageCount, total, onChange }) {
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const end = Math.min(page * PAGE_SIZE, total)
  return (
    <div className="admin-pagination">
      <span>Showing {start}–{end} of {total}</span>
      <div><button aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></button><span>Page {page} of {pageCount}</span><button aria-label="Next page" disabled={page >= pageCount} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></button></div>
    </div>
  )
}
