import React, { cloneElement, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Plus, Search, X } from 'lucide-react'
import { formatDate, formatMonthLabel, formatTaka } from '../../utils/formatters.js'
import useAdminResource from '../../hooks/useAdminResource.js'
import useMetadata from '../../hooks/useMetadata.js'
import AdminActionDialog from './AdminActionDialog.jsx'
import { getRequestErrorMessage, readJsonResponse } from '../../utils/requestErrors.js'
import {
  EmptyState, PageTitle, Pagination, TransactionTable,
} from './AdminShared.jsx'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const EMPTY_TRANSACTION = {
  date: '',
  type: '',
  category: '',
  amount: '',
  note: '',
  paymentMethod: '',
  donorName: '',
  memberId: null,
  dueMonths: [],
  dueYear: '',
}

export default function AdminTransactions({ transactionForm }) {
  const [searchParams] = useSearchParams()
  const member = searchParams.get('member') || ''
  const dueMonth = searchParams.get('dueMonth') || ''
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('recently-added')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_TRANSACTION)
  const [mutationStatus, setMutationStatus] = useState('idle')
  const [mutationError, setMutationError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [removing, setRemoving] = useState(null)
  const [editMemberQuery, setEditMemberQuery] = useState('')
  const [editMemberSuggestions, setEditMemberSuggestions] = useState([])
  const [editMemberSearchStatus, setEditMemberSearchStatus] = useState('idle')
  const [editMemberSearchError, setEditMemberSearchError] = useState('')
  const { data, status, error, refetch } = useAdminResource('transactions', { q: query, type, sort, page, pageSize: 10, member, dueMonth })
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
        const result = await readJsonResponse(response, 'We couldn’t search for members. Try typing the name again.')
        setEditMemberSuggestions(result.rows || [])
        setEditMemberSearchStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setEditMemberSuggestions([])
          setEditMemberSearchError(getRequestErrorMessage(error))
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
      donorName: transaction.memberName || transaction.donorName || '',
      memberId: transaction.memberId,
      dueMonths: transaction.dueMonths || [],
      dueYear: transaction.dueYear || Number((transaction.date || '').slice(0, 4)),
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
    const { memberId, ...fields } = editForm
    const resolveTypedMember = isMonthlyDueCategory && !memberId && fields.donorName.trim() !== ''
    if (isMonthlyDueCategory && !memberId && !resolveTypedMember && (editing.memberId || fields.dueMonths.length)) {
      setMutationError('Enter a member name to assign this payment to monthly dues.')
      return
    }
    setMutationStatus('saving')
    setSaveMessage('')
    setMutationError('')
    try {
      const response = await fetch('/api/admin-data?resource=transactions', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          ...((memberId !== editing.memberId || resolveTypedMember) && { memberId }),
          donorName: memberId ? '' : fields.donorName,
          id: editing.id,
          amount: Number(editForm.amount),
        }),
      })
      await readJsonResponse(response, 'We couldn’t save this transaction. Try again. If the problem continues, contact the site administrator.')
      setSaveMessage('Transaction updated.')
      setEditing(null)
      setMutationStatus('idle')
      refetch()
    } catch (saveError) {
      setMutationError(getRequestErrorMessage(saveError))
      setMutationStatus('idle')
    }
  }

  const removeRecord = async () => {
    const response = await fetch('/api/admin-data?resource=transactions', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: removing.id }),
      signal: AbortSignal.timeout(12000),
    })
    await readJsonResponse(response, 'We couldn’t remove this transaction. Try again. If the problem continues, contact the site administrator.')
    refetch()
    return 'This transaction was removed from the transaction list and financial reports.'
  }

  const updateForm = (key, value) => setEditForm(current => ({ ...current, [key]: value }))
  const isMonthlyDueCategory = editForm.type === 'income' && /^imam hadi?ya$/i.test(editForm.category.trim())

  return (
    <>
      <PageTitle
        title="Transactions"
        description="Find, add, and manage income and expense records."
        action={transactionForm && <button type="button" className="admin-button admin-button--primary" onClick={() => setAdding(current => !current)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? 'Close form' : 'Add transaction'}</button>}
      />
      {dueMonth && (
        <div className="admin-data-status">
          <span>Showing payments applied to {formatMonthLabel(dueMonth)}. The transaction date is when the payment was recorded.</span>
          <Link className="text-link" to="/admin/transactions" onClick={() => {
            setPage(1)
            setQuery('')
            setQueryInput('')
            setType('all')
          }}>View all transactions</Link>
        </div>
      )}
      {mutationError && !editing && <div className="admin-data-status admin-data-status--error" role="alert">{mutationError}</div>}
      {saveMessage && <div className="admin-data-status admin-data-status--success" role="status">{saveMessage}</div>}
      {status === 'loading' && <div className="admin-data-status" role="status">Loading transactions…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>We couldn’t load the transaction list. {error}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <section className="admin-panel">
          <form className="admin-toolbar" onSubmit={applySearch}>
            <label className="admin-search"><Search size={17} /><input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="Search description, member, or receipt..." /></label>
            <select aria-label="Filter transactions by type" disabled={metadataStatus !== 'ready'} value={type} onChange={event => { setType(event.target.value); setPage(1) }}><option value="all">All types</option>{(metadata?.transactionTypes || []).map(value => <option key={value} value={value}>{value}</option>)}</select>
            <select aria-label="Sort transactions" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}>
              <option value="recently-added">Recently added</option>
              <option value="transaction-date">Transaction date</option>
            </select>
            <button type="submit" className="admin-button admin-button--primary">Search</button>
            <div className="admin-result-count">{data.total} records</div>
          </form>
          {transactions.length
            ? <TransactionTable transactions={transactions} onEdit={startEditing} onDelete={setRemoving} />
            : <EmptyState icon={ArrowLeftRight} title="No transactions found" description="There are no records matching these filters." />}
          <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
        </section>
      )}
      {removing && (
        <AdminActionDialog
          danger
          title="Delete this transaction?"
          description="This transaction will be removed from financial reports and totals. Any monthly dues it paid will be recalculated."
          detail={<>
            <strong>{formatTaka(removing.amount)} · {removing.category || 'Uncategorized'}</strong>
            <span>{formatDate(removing.date)}{(removing.memberName || removing.donorName) && ` · ${removing.memberName || removing.donorName}`}</span>
            {removing.note && <span>{removing.note}</span>}
          </>}
          actionLabel="Delete transaction"
          pendingLabel="Deleting transaction…"
          successTitle="Transaction deleted"
          onConfirm={removeRecord}
          onClose={() => setRemoving(null)}
        />
      )}
      {adding && transactionForm && (
        <div className="admin-dialog-backdrop">
          <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title">
            <div className="admin-dialog-header">
              <div><h2 id="add-transaction-title">Add transaction</h2><p className="admin-mono">New transaction entry</p></div>
              <button type="button" className="admin-icon-button" aria-label="Close add transaction dialog" onClick={() => setAdding(false)} disabled={mutationStatus === 'saving'}><X size={18} /></button>
            </div>
            {cloneElement(transactionForm, { onSaved: () => { refetch(); setAdding(false); setSaveMessage('Transaction saved.') } })}
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
                <label>Date<input type="date" required value={editForm.date} onChange={event => {
                  setEditForm(current => ({ ...current, date: event.target.value, dueYear: Number(event.target.value.slice(0, 4)) }))
                }} /></label>
                <label>Type<select required disabled={metadataStatus !== 'ready'} value={editForm.type} onChange={event => {
                  setEditForm(current => ({ ...current, type: event.target.value, category: '', dueMonths: [] }))
                }}>{
                  Array.from(new Set([...(metadata?.transactionTypes || []), editForm.type].filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)
                }</select></label>
                <label>Category<select required disabled={metadataStatus !== 'ready'} value={editForm.category} onChange={event => {
                  setEditForm(current => ({ ...current, category: event.target.value, dueMonths: [] }))
                }}>
                  <option value="">— Select —</option>
                  {Array.from(new Set([
                    ...(metadata?.transactionCategories || [])
                      .filter(item => !editForm.type || item.type === editForm.type)
                      .map(item => item.name),
                    ...(editForm.category ? [editForm.category] : []),
                  ])).map(name => <option key={name} value={name}>{name}</option>)}
                </select></label>
                {isMonthlyDueCategory && (
                  <>
                    <label className="admin-form--transaction-note">
                      Monthly dues months (optional)
                      <details className="admin-transaction-month-picker">
                        <summary title={editForm.dueMonths.map(month => MONTH_NAMES[month - 1]).join(', ')}>
                          {editForm.dueMonths.length
                            ? `${editForm.dueMonths.length} month${editForm.dueMonths.length === 1 ? '' : 's'} selected`
                            : 'Use transaction date month'}
                        </summary>
                        <div className="admin-transaction-month-options">
                          {MONTH_NAMES.map((month, index) => {
                            const monthNumber = index + 1
                            return (
                              <label key={month}>
                                <input
                                  type="checkbox"
                                  checked={editForm.dueMonths.includes(monthNumber)}
                                  onChange={event => updateForm('dueMonths', event.target.checked
                                    ? [...editForm.dueMonths, monthNumber].sort((a, b) => a - b)
                                    : editForm.dueMonths.filter(value => value !== monthNumber))}
                                />
                                {month}
                              </label>
                            )
                          })}
                        </div>
                      </details>
                      <small>{editForm.dueMonths.length
                        ? 'Choose a member to assign this payment to the selected months.'
                        : 'If no month is selected, the transaction date month is used.'}</small>
                    </label>
                    {editForm.dueMonths.length > 0 && (
                      <label>Year for selected months<input type="number" min="2000" max="2200" required value={editForm.dueYear} onChange={event => updateForm('dueYear', event.target.value)} /></label>
                    )}
                  </>
                )}
                <label>Amount (Taka)<input type="number" min="0.01" step="0.01" required value={editForm.amount} onChange={event => updateForm('amount', event.target.value)} /></label>
                <label>Payment method<select required disabled={metadataStatus !== 'ready'} value={editForm.paymentMethod} onChange={event => updateForm('paymentMethod', event.target.value)}>{
                  Array.from(new Set([...(metadata?.paymentMethods || []), editForm.paymentMethod].filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)
                }</select></label>
                <label>Member or donor / payee name
                  <div className="transaction-member-search">
                    <input maxLength={500} value={editForm.donorName} onChange={event => {
                      const donorName = event.target.value
                      setEditForm(current => ({ ...current, donorName, memberId: null }))
                      setEditMemberQuery(donorName)
                    }} />
                    {editMemberSuggestions.length > 0 && (
                      <div id="edit-transaction-member-suggestions" className="transaction-member-suggestions" role="listbox" aria-label="Matching members">
                        {editMemberSuggestions.map(member => (
                          <button
                            type="button"
                            key={member.id}
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              setEditForm(current => ({ ...current, donorName: member.fullName, memberId: member.id }))
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
                {editForm.memberId && editForm.memberId !== editing.memberId && (
                  <small className="transaction-member-search-status">This payment will be assigned to {editForm.donorName} when you save.</small>
                )}
                {editMemberSearchStatus === 'loading' && <small className="transaction-member-search-status" role="status">Searching members…</small>}
                {isMonthlyDueCategory && !editForm.memberId && editForm.donorName.trim() && (
                  <small className="transaction-member-search-status">Saving will use an active member with this name or create one if no match exists.</small>
                )}
                {editMemberSearchStatus === 'error' && <small className="transaction-member-search-status transaction-member-search-status--error" role="alert">{editMemberSearchError}</small>}
                <label className="admin-form--transaction-note">Description<textarea rows={3} maxLength={5000} value={editForm.note} onChange={event => updateForm('note', event.target.value)} /></label>
              </div>
              {metadataStatus === 'loading' && <div className="admin-data-status" role="status">Loading form choices…</div>}
              {metadataStatus === 'error' && <div className="admin-data-status admin-data-status--error" role="alert">We couldn’t load the choices for this form. {metadataError}</div>}
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
