import React, { cloneElement, useEffect, useState } from 'react'
import { ArrowLeftRight, Plus, Search, X } from 'lucide-react'
import useAdminResource from '../../hooks/useAdminResource.js'
import useMetadata from '../../hooks/useMetadata.js'
import {
  EmptyState, PageTitle, Pagination, TransactionTable,
} from './AdminShared.jsx'

const EMPTY_TRANSACTION = {
  date: '',
  type: '',
  category: '',
  amount: '',
  note: '',
  paymentMethod: '',
  donorName: '',
}

export default function AdminTransactions({ transactionForm }) {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_TRANSACTION)
  const [mutationStatus, setMutationStatus] = useState('idle')
  const [mutationError, setMutationError] = useState('')
  const [editMemberQuery, setEditMemberQuery] = useState('')
  const [editMemberSuggestions, setEditMemberSuggestions] = useState([])
  const [editMemberSearchStatus, setEditMemberSearchStatus] = useState('idle')
  const [editMemberSearchError, setEditMemberSearchError] = useState('')
  const { data, status, error, refetch } = useAdminResource('transactions', { q: query, type, page, pageSize: 10 })
  const { data: metadata, status: metadataStatus, error: metadataError } = useMetadata()
  const transactions = data?.rows || []
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 10)))

  useEffect(() => {
    const query = editMemberQuery.trim()
    if (query.length < 2) {
      setEditMemberSuggestions([])
      setEditMemberSearchStatus('idle')
      setEditMemberSearchError('')
      return undefined
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setEditMemberSearchStatus('loading')
      setEditMemberSearchError('')
      try {
        const response = await fetch(`/api/member-search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
        setEditMemberSuggestions(result.rows || [])
        setEditMemberSearchStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setEditMemberSuggestions([])
          setEditMemberSearchError(error.message || 'Failed to search members.')
          setEditMemberSearchStatus('error')
        }
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [editMemberQuery])

  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount])

  const applySearch = event => {
    event.preventDefault()
    setQuery(queryInput.trim())
    setPage(1)
  }

  const startEditing = transaction => {
    setEditing(transaction)
    setEditForm({
      date: transaction.date || '',
      type: transaction.type || '',
      category: transaction.category === 'Uncategorized' ? '' : transaction.category || '',
      amount: String(transaction.amount ?? ''),
      note: transaction.note || '',
      paymentMethod: transaction.paymentMethod || '',
      donorName: transaction.donorName || '',
    })
    setMutationError('')
    setMutationStatus('idle')
    setEditMemberQuery('')
    setEditMemberSuggestions([])
    setEditMemberSearchStatus('idle')
    setEditMemberSearchError('')
  }

  const saveEdit = async event => {
    event.preventDefault()
    setMutationStatus('saving')
    setMutationError('')
    try {
      const response = await fetch('/api/admin-data?resource=transactions', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, id: editing.id, amount: Number(editForm.amount) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      setEditing(null)
      setMutationStatus('idle')
      refetch()
    } catch (saveError) {
      setMutationError(saveError.message || 'Failed to save transaction.')
      setMutationStatus('idle')
    }
  }

  const deleteTransaction = async transaction => {
    if (!window.confirm(`Delete transaction #${transaction.id}? This will remove it from active reports.`)) return
    setMutationStatus('deleting')
    setMutationError('')
    try {
      const response = await fetch('/api/admin-data?resource=transactions', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      refetch()
      setMutationStatus('idle')
    } catch (deleteError) {
      setMutationError(deleteError.message || 'Failed to delete transaction.')
      setMutationStatus('idle')
    }
  }

  const updateForm = (key, value) => setEditForm(current => ({ ...current, [key]: value }))

  return (
    <>
      <PageTitle
        eyebrow="Finance"
        title="Transactions"
        description="View and manage transaction records stored in the database."
        action={transactionForm && <button type="button" className="admin-button admin-button--primary" onClick={() => setAdding(current => !current)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? 'Close form' : 'Add transaction'}</button>}
      />
      {mutationError && !editing && <div className="admin-data-status admin-data-status--error" role="alert">{mutationError}</div>}
      {mutationStatus === 'deleting' && <div className="admin-data-status" role="status">Deleting transaction…</div>}
      {status === 'loading' && <div className="admin-data-status" role="status">Loading transactions…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>Could not load transactions: {error || 'Unknown error'}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <section className="admin-panel">
          <form className="admin-toolbar" onSubmit={applySearch}>
            <label className="admin-search"><Search size={17} /><input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="Search description, member, or receipt..." /></label>
            <select aria-label="Filter transactions by type" disabled={metadataStatus !== 'ready'} value={type} onChange={event => { setType(event.target.value); setPage(1) }}><option value="all">All types</option>{(metadata?.transactionTypes || []).map(value => <option key={value} value={value}>{value}</option>)}</select>
            <button type="submit" className="admin-button admin-button--primary">Search</button>
            <div className="admin-result-count">{data.total} records</div>
          </form>
          {transactions.length
            ? <TransactionTable transactions={transactions} onEdit={startEditing} onDelete={deleteTransaction} actionsDisabled={mutationStatus === 'deleting'} />
            : <EmptyState icon={ArrowLeftRight} title="No transactions found" description="There are no records matching these filters." />}
          <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
        </section>
      )}
      {adding && transactionForm && (
        <div className="admin-dialog-backdrop">
          <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title">
            <div className="admin-dialog-header">
              <div><h2 id="add-transaction-title">Add transaction</h2><p className="admin-mono">New transaction entry</p></div>
              <button type="button" className="admin-icon-button" aria-label="Close add transaction dialog" onClick={() => setAdding(false)} disabled={mutationStatus === 'saving'}><X size={18} /></button>
            </div>
            {cloneElement(transactionForm, { onSaved: () => { refetch(); setAdding(false) } })}
          </section>
        </div>
      )}
      {editing && (
        <div className="admin-dialog-backdrop">
          <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title">
            <div className="admin-dialog-header">
              <div><h2 id="edit-transaction-title">Edit transaction</h2><p className="admin-mono">Transaction #{editing.id}</p></div>
              <button type="button" className="admin-icon-button" aria-label="Close edit transaction dialog" onClick={() => { setEditing(null); setMutationError('') }} disabled={mutationStatus === 'saving'}><X size={18} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="admin-form admin-form--transaction">
                <label>Date<input type="date" required value={editForm.date} onChange={event => updateForm('date', event.target.value)} /></label>
                <label>Type<select required disabled={metadataStatus !== 'ready'} value={editForm.type} onChange={event => { updateForm('type', event.target.value); updateForm('category', '') }}>{
                  Array.from(new Set([...(metadata?.transactionTypes || []), editForm.type].filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)
                }</select></label>
                <label>Category<select required disabled={metadataStatus !== 'ready'} value={editForm.category} onChange={event => updateForm('category', event.target.value)}>
                  <option value="">— Select —</option>
                  {Array.from(new Set([
                    ...(metadata?.transactionCategories || [])
                      .filter(item => !editForm.type || item.type === editForm.type)
                      .map(item => item.name),
                    ...(editForm.category ? [editForm.category] : []),
                  ])).map(name => <option key={name} value={name}>{name}</option>)}
                </select></label>
                <label>Amount (Taka)<input type="number" min="0.01" step="0.01" required value={editForm.amount} onChange={event => updateForm('amount', event.target.value)} /></label>
                <label>Payment method<select required disabled={metadataStatus !== 'ready'} value={editForm.paymentMethod} onChange={event => updateForm('paymentMethod', event.target.value)}>{
                  Array.from(new Set([...(metadata?.paymentMethods || []), editForm.paymentMethod].filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)
                }</select></label>
                <label>Donor / payee name
                  <div className="transaction-member-search">
                    <input maxLength={500} value={editForm.donorName} onChange={event => { updateForm('donorName', event.target.value); setEditMemberQuery(event.target.value) }} />
                    {editMemberSuggestions.length > 0 && (
                      <div id="edit-transaction-member-suggestions" className="transaction-member-suggestions" role="listbox" aria-label="Matching members">
                        {editMemberSuggestions.map(member => (
                          <button
                            type="button"
                            key={member.id}
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              updateForm('donorName', member.fullName)
                              setEditMemberQuery('')
                              setEditMemberSuggestions([])
                              setEditMemberSearchStatus('idle')
                            }}
                          >
                            <strong>{member.fullName}</strong>
                            {member.memberCode && <small>{member.memberCode}</small>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                {editMemberSearchStatus === 'loading' && <small className="transaction-member-search-status" role="status">Searching members…</small>}
                {editMemberSearchStatus === 'ready' && !editMemberSuggestions.length && editMemberQuery.trim().length >= 2 && <small className="transaction-member-search-status">No active members match. You can enter a name manually.</small>}
                {editMemberSearchStatus === 'error' && <small className="transaction-member-search-status transaction-member-search-status--error" role="alert">Could not search members: {editMemberSearchError}</small>}
                <label className="admin-form--transaction-note">Description<textarea rows={3} maxLength={5000} value={editForm.note} onChange={event => updateForm('note', event.target.value)} /></label>
              </div>
              {metadataStatus === 'loading' && <div className="admin-data-status" role="status">Loading database options…</div>}
              {metadataStatus === 'error' && <div className="admin-data-status admin-data-status--error" role="alert">Could not load database options: {metadataError}</div>}
              {mutationError && <div className="admin-data-status admin-data-status--error" role="alert">{mutationError}</div>}
              <div className="admin-dialog-actions">
                <button type="button" className="admin-button admin-button--quiet" onClick={() => { setEditing(null); setMutationError('') }} disabled={mutationStatus === 'saving'}>Cancel</button>
                <button type="submit" className="admin-button admin-button--primary" disabled={mutationStatus === 'saving' || metadataStatus !== 'ready'}>{mutationStatus === 'saving' ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
