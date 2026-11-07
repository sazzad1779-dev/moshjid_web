import React, { useEffect, useState } from 'react'
import { ArrowLeftRight, Search } from 'lucide-react'
import {
  EmptyState, PageTitle, Pagination, PreviewNotice, TransactionDialog,
  TransactionTable, PAGE_SIZE,
} from './AdminShared.jsx'

export default function AdminTransactions({ transactions, setTransactions, transactionForm }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const filtered = transactions.filter(transaction => {
    const matchesText = `${transaction.date} ${transaction.note} ${transaction.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (typeFilter === 'All types' || transaction.type === typeFilter.toLowerCase())
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageTransactions = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount])

  const edit = transaction => setEditing({ transaction, index: transactions.indexOf(transaction) })
  const save = updated => {
    setTransactions(current => current.map((item, index) => index === editing.index ? updated : item))
    setEditing(null)
  }
  const remove = transaction => {
    if (window.confirm('Delete this transaction from the current preview?')) {
      const sourceIndex = transactions.indexOf(transaction)
      setTransactions(current => current.filter((_, itemIndex) => itemIndex !== sourceIndex))
    }
  }

  return (
    <>
      <PageTitle eyebrow="Finance" title="Transactions" description="Review the transaction ledger, search records, and manage entries." />
      <PreviewNotice>The current feed only includes public-safe transaction fields. Edit and delete actions are preview-only until an admin API is connected.</PreviewNotice>
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="admin-search"><Search size={17} /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search transactions..." /></label>
          <select aria-label="Filter transactions by type" value={typeFilter} onChange={event => { setTypeFilter(event.target.value); setPage(1) }}><option>All types</option><option>Income</option><option>Expense</option></select>
          <div className="admin-result-count">{filtered.length} records</div>
        </div>
        {pageTransactions.length
          ? <TransactionTable transactions={pageTransactions} onEdit={edit} onDelete={remove} />
          : <EmptyState icon={ArrowLeftRight} title="No transactions found" description="There are no records matching these filters." />}
        <Pagination page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
      </section>
      {transactionForm}
      {editing && <TransactionDialog transaction={editing.transaction} onClose={() => setEditing(null)} onSave={save} />}
    </>
  )
}
