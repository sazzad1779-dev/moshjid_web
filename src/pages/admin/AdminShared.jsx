import React from 'react'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, ChevronLeft, ChevronRight, Pencil, Trash2,
} from 'lucide-react'
import { formatDate, formatTaka } from '../../utils/formatters.js'

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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

export function PreviewNotice({ children }) {
  return <div className="admin-preview-notice"><Bell size={15} aria-hidden="true" />{children}</div>
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

export function TransactionTable({ transactions, compact = false, onEdit, onDelete, actionsDisabled = false }) {
  const canManage = !compact && (onEdit || onDelete)
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th className="admin-align-right">Amount</th>{canManage && <th className="admin-align-right">Actions</th>}</tr></thead>
        <tbody>{transactions.map((transaction, index) => (
          <tr key={transaction.id || `${transaction.date}-${index}`}>
            <td className="admin-nowrap">{formatDate(transaction.date)}</td>
            <td><div className="admin-description">{transaction.note || '—'}</div>{(transaction.memberName || transaction.donorName) && <small className="admin-mono">{transaction.memberName || transaction.donorName}</small>}{transaction.id && <small className="admin-mono"> · #{transaction.id}</small>}</td>
            <td>{transaction.category || 'Uncategorized'}</td>
            <td><span className={`admin-type admin-type--${transaction.type || 'other'}`}>{transaction.type === 'income' ? <ArrowDownLeft size={14} /> : transaction.type === 'expense' ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}{transaction.type || 'other'}</span></td>
            <td className={`admin-align-right admin-amount ${transaction.type === 'income' ? 'is-income' : transaction.type === 'expense' ? 'is-expense' : ''}`}>{formatTaka(transaction.amount)}</td>
            {canManage && <td><div className="admin-row-actions">{onEdit && <button type="button" className="admin-icon-button" aria-label={`Edit transaction ${transaction.id}`} onClick={() => onEdit(transaction)} disabled={actionsDisabled}><Pencil size={15} /></button>}{onDelete && <button type="button" className="admin-icon-button admin-icon-button--danger" aria-label={`Delete transaction ${transaction.id}`} onClick={() => onDelete(transaction)} disabled={actionsDisabled}><Trash2 size={15} /></button>}</div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pageCount, total, onChange, pageSize = PAGE_SIZE }) {
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)
  return (
    <div className="admin-pagination">
      <span>Showing {start}–{end} of {total}</span>
      <div><button aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></button><span>Page {page} of {pageCount}</span><button aria-label="Next page" disabled={page >= pageCount} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></button></div>
    </div>
  )
}
