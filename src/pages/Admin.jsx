import React, { useEffect, useState } from 'react'
import { ArrowDownLeft, Calculator, List, LockKeyhole, LogOut, X } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { getRequestErrorMessage, readJsonResponse } from '../utils/requestErrors.js'
import ChartShell from '../components/ChartShell.jsx'
import PageHeading from '../components/PageHeading.jsx'
import Kpi from '../components/Kpi.jsx'
import TableShell from '../components/TableShell.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useCollectorData } from '../hooks/useCollectorData.js'
import useMetadata from '../hooks/useMetadata.js'
import { formatTaka, formatDate } from '../utils/formatters.js'
import { COLORS } from '../constants.js'
import AdminWorkspace from './AdminWorkspace.jsx'

const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
const DUE_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ── Transaction Form ──
function TransactionForm({ enteredBy, onSaved }) {
  const { role } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const empty = { date: today, type: 'income', category: '', description: '', amount: '', paymentMethod: '', notes: '', donorName: '', memberId: '', dueMonths: [], dueYear: Number(today.slice(0, 4)) }
  const [form, setForm] = useState(empty)
  const [status, setStatus] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [memberSearchStatus, setMemberSearchStatus] = useState('idle')
  const [memberSearchError, setMemberSearchError] = useState('')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [newMemberPrompt, setNewMemberPrompt] = useState(null)
  const [memberDetailForm, setMemberDetailForm] = useState({ phone: '', email: '', address: '', areaId: '', monthlyAmount: '', status: '' })
  const [memberDetailStatus, setMemberDetailStatus] = useState('idle')
  const [memberDetailError, setMemberDetailError] = useState('')
  const { data: metadata, status: metadataStatus, error: metadataError } = useMetadata()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  useEffect(() => {
    const query = memberQuery.trim()
    if (query.length < 2) {
      setMemberSuggestions([])
      setMemberSearchStatus('idle')
      setMemberSearchError('')
      return undefined
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setMemberSearchStatus('loading')
      setMemberSearchError('')
      try {
        const response = await fetch(`/api/member-search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await readJsonResponse(response, 'We couldn’t search for members. Try typing the name again.')
        setMemberSuggestions(result.rows || [])
        setMemberSearchStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMemberSuggestions([])
          setMemberSearchError(getRequestErrorMessage(error))
          setMemberSearchStatus('error')
        }
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [memberQuery])

  // Default statement for Friday / Magrib collections
  useEffect(() => {
    if (descriptionTouched) return
    const isFriday = form.category === 'Friday Collection' || new Date(form.date).getDay() === 5
    const isMagrib = form.category === 'Magrib Donation'
    if (!isFriday && !isMagrib) return
    const dateText = formatDate(form.date)
    const amountText = form.amount ? `${form.amount} টাকা` : ''
    let text = ''
    if (isFriday) {
      text = `${dateText} তারিখের জুমা কালেকশন${amountText ? ' ' + amountText : ''}`.trim()
    } else {
      text = `${dateText} তারিখে মাগরিব নামাজের পর দান${amountText ? ' ' + amountText : ''}`.trim()
    }
    setForm(f => (f.description === text ? f : { ...f, description: text }))
  }, [form.category, form.date, form.amount, descriptionTouched])

  const categoryRows = metadata?.transactionCategories || []
  const transactionTypes = [...new Set(categoryRows.map(item => item.type).filter(Boolean))]
  const selectedType = transactionTypes.includes(form.type)
    ? form.type
    : transactionTypes.includes('income')
      ? 'income'
      : (transactionTypes[0] || '')
  const categories = categoryRows.filter(item => item.type === selectedType).map(item => item.name)
  const isMonthlyDueCategory = selectedType === 'income' && /^imam hadi?ya$/i.test(form.category.trim())
  const hasSelectedMonths = isMonthlyDueCategory && form.dueMonths.length > 0
  const paymentMethods = metadata?.paymentMethods || []
  const selectedPaymentMethod = paymentMethods.includes(form.paymentMethod) ? form.paymentMethod : paymentMethods[0] || ''
  const userStatuses = metadata?.userStatuses || []
  const areas = metadata?.areas || []
  const selectedMemberStatus = userStatuses.includes(memberDetailForm.status) ? memberDetailForm.status : userStatuses[0] || ''
  const metadataMessage = metadataStatus === 'loading'
    ? 'Loading form choices…'
    : metadataStatus === 'error'
      ? `We couldn’t load the choices for this form. ${metadataError}`
      : !transactionTypes.length
        ? 'No transaction categories are available. Ask the site administrator to add a category.'
        : !paymentMethods.length
          ? 'No payment methods are available. Ask the site administrator to add one.'
          : ''
  const canSubmit = metadataStatus === 'ready' && !metadataMessage && categories.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || status === 'loading') return
    if (hasSelectedMonths && !form.memberId && !form.donorName.trim()) {
      setErrMsg('Select an existing member or enter a new member name for the selected months.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/add-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: selectedType, paymentMethod: selectedPaymentMethod, enteredBy })
      })
      const data = await readJsonResponse(res, 'We couldn’t save the transaction. Try again. If the problem continues, contact the site administrator.')
      setStatus('success')
      setForm(empty)
      setMemberQuery('')
      setMemberSuggestions([])
      setDescriptionTouched(false)
      if (data?.newMember && data?.memberId) {
        setNewMemberPrompt({
          id: data.memberId,
          name: (form.donorName || '').trim(),
          paymentTransactionId: form.dueMonths.length > 1 ? String(data.id) : undefined,
        })
        setMemberDetailForm({ phone: '', email: '', address: '', areaId: '', monthlyAmount: '', status: userStatuses[0] || 'active' })
      } else {
        onSaved?.()
        setTimeout(() => setStatus(null), 3000)
      }
    } catch (err) {
      setErrMsg(getRequestErrorMessage(err))
      setStatus('error')
    }
  }

  const saveMemberDetails = async (e) => {
    e.preventDefault()
    if (!newMemberPrompt) return
    setMemberDetailStatus('saving')
    setMemberDetailError('')
    try {
      const response = await fetch('/api/admin-data?resource=members', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newMemberPrompt.id,
          fullName: newMemberPrompt.name,
          phone: memberDetailForm.phone,
          email: memberDetailForm.email,
          address: memberDetailForm.address,
          areaId: memberDetailForm.areaId,
          status: selectedMemberStatus,
          ...(memberDetailForm.monthlyAmount !== '' && {
            monthlyAmount: memberDetailForm.monthlyAmount,
            paymentTransactionId: newMemberPrompt.paymentTransactionId,
          }),
        }),
      })
      await readJsonResponse(response, 'We couldn’t save the member details. Try again, or close this popup and update the profile from Members.')
      setNewMemberPrompt(null)
      setMemberDetailStatus('idle')
      onSaved?.()
      setTimeout(() => setStatus(null), 3000)
    } catch (saveError) {
      setMemberDetailError(`The transaction is saved. ${getRequestErrorMessage(saveError)}`)
      setMemberDetailStatus('idle')
    }
  }

  const skipMemberDetails = () => {
    setNewMemberPrompt(null)
    onSaved?.()
    setTimeout(() => setStatus(null), 3000)
  }

  const inp = (extra = {}) => ({
    style: { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--c-border-strong)', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', background: 'var(--c-surface)', color: 'var(--c-ink)' },
    onFocus: e => e.target.style.borderColor = 'var(--c-primary)',
    onBlur: e => e.target.style.borderColor = 'var(--c-border-strong)',
    ...extra
  })

  return (
    <ChartShell title="Add Transaction" subtitle="লেনদেন যোগ করুন">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, maxWidth: 600 }}>

        <div className="form-grid-2">
          <div>
            <label style={lbl}>Date / তারিখ *</label>
            <input type="date" required value={form.date} onChange={e => {
              setForm(current => ({ ...current, date: e.target.value, dueYear: Number(e.target.value.slice(0, 4)) }))
            }} {...inp()} />
          </div>
          <div>
            <label style={lbl}>Type / ধরন *</label>
            <select required disabled={!transactionTypes.length || metadataStatus !== 'ready'} value={selectedType} onChange={e => { set('type', e.target.value); set('category', ''); set('dueMonths', []) }} {...inp()}>
              {transactionTypes.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Category / ক্যাটাগরি *</label>
          <select required disabled={!categories.length || metadataStatus !== 'ready'} value={form.category} onChange={e => { set('category', e.target.value); set('dueMonths', []) }} {...inp()}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Description / বিবরণ (optional)</label>
          <input type="text" placeholder="e.g. Friday donation" value={form.description} onChange={e => { set('description', e.target.value); setDescriptionTouched(true) }} {...inp()} />
        </div>

        <div>
          <label htmlFor="transaction-member-name" style={lbl}>
            {hasSelectedMonths ? 'Member name *' : selectedType === 'income' ? 'Member / Donor Name (optional)' : 'Member / Payee Name (optional)'}
          </label>
          <div className="transaction-member-search">
            <input
              id="transaction-member-name"
              required={hasSelectedMonths}
              type="text"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={memberSuggestions.length > 0}
              aria-controls="transaction-member-suggestions"
              placeholder="Type a member name or enter another name"
              value={form.donorName}
              onChange={e => {
                set('donorName', e.target.value)
                set('memberId', '')
                          setMemberQuery(e.target.value)
              }}
              {...inp()}
            />
            {memberSuggestions.length > 0 && (
              <div id="transaction-member-suggestions" className="transaction-member-suggestions" role="listbox" aria-label="Matching members">
                {memberSuggestions.map(member => (
                  <button
                    type="button"
                    key={member.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      set('donorName', member.fullName)
                      set('memberId', member.id)
                                      setMemberQuery('')
                      setMemberSuggestions([])
                      setMemberSearchStatus('idle')
                    }}
                  >
                    <strong>{member.fullName}</strong>
                    {member.memberCode && <small>{member.memberCode}</small>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {memberSearchStatus === 'loading' && <small className="transaction-member-search-status" role="status">Searching members…</small>}
          {memberSearchStatus === 'ready' && !memberSuggestions.length && memberQuery.trim().length >= 2 && <small className="transaction-member-search-status">No active members match. You can enter a name manually.</small>}
          {memberSearchStatus === 'error' && <small className="transaction-member-search-status transaction-member-search-status--error" role="alert">{memberSearchError}</small>}
          {form.memberId && <small className="transaction-member-search-status">Selected member will be linked to this transaction.</small>}
        </div>

        {isMonthlyDueCategory && (
          <div className="form-grid-2">
            <div>
              <label style={lbl}>Monthly dues months (optional)</label>
              <details style={{ border: '1px solid var(--c-border-strong)', borderRadius: 10, background: 'var(--c-surface)' }}>
                <summary
                  title={form.dueMonths.map(month => DUE_MONTHS[month - 1]).join(', ')}
                  style={{ padding: '11px 14px', color: 'var(--c-ink)', cursor: 'pointer', fontSize: 14 }}
                >
                  {form.dueMonths.length
                    ? `${form.dueMonths.length} month${form.dueMonths.length === 1 ? '' : 's'} selected`
                    : 'Use transaction date month'}
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, padding: '4px 14px 14px' }}>
                  {DUE_MONTHS.map((month, index) => {
                    const monthNumber = index + 1
                    return (
                      <label key={month} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-ink)', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
                        <input
                          type="checkbox"
                          checked={form.dueMonths.includes(monthNumber)}
                          onChange={event => set('dueMonths', event.target.checked
                            ? [...form.dueMonths, monthNumber].sort((a, b) => a - b)
                            : form.dueMonths.filter(value => value !== monthNumber))}
                        />
                        {month}
                      </label>
                    )
                  })}
                </div>
              </details>
              <small style={{ display: 'block', marginTop: 6, color: 'var(--c-muted)', fontSize: 12 }}>
                {form.dueMonths.length
                  ? 'The payment is applied to the selected months in order. Without a monthly amount, it is split evenly.'
                  : 'If no month is selected, the transaction date month is used.'}
              </small>
            </div>
            {form.dueMonths.length > 0 && (
              <div>
                <label style={lbl}>Year for selected months</label>
                <input
                  type="number"
                  min="2000"
                  max="2200"
                  required
                  value={form.dueYear}
                  onChange={event => set('dueYear', event.target.value)}
                  {...inp()}
                />
              </div>
            )}
          </div>
        )}

        <div className="form-grid-2">
          <div>
            <label style={lbl}>Amount (Taka) / পরিমাণ *</label>
            <input type="number" required min="0.01" step="0.01" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} {...inp()} />
          </div>
          <div>
            <label style={lbl}>Payment Method *</label>
            <select required disabled={!paymentMethods.length || metadataStatus !== 'ready'} value={selectedPaymentMethod} onChange={e => set('paymentMethod', e.target.value)} {...inp()}>
              {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Additional Notes / অতিরিক্ত মন্তব্য</label>
          <textarea rows={2} placeholder="Optional extra details…" value={form.notes} onChange={e => set('notes', e.target.value)}
            style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--c-border-strong)', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical', background: 'var(--c-surface)', color: 'var(--c-ink)' }}
            onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--c-border-strong)'}
          />
        </div>

        <button type="submit" disabled={status === 'loading' || !canSubmit} style={{
          border: 'none', borderRadius: 12, padding: '13px 20px',
          background: status === 'loading' || !canSubmit ? 'var(--c-muted-2)' : 'var(--c-primary-button)',
          color: 'var(--c-on-primary)', fontWeight: 700, cursor: status === 'loading' ? 'wait' : 'pointer', fontSize: 15
        }}>
          {status === 'loading' ? 'Saving…' : 'Save Transaction'}
        </button>

        {metadataMessage && <div role="status" style={{ color: metadataStatus === 'error' ? 'var(--c-expense)' : 'var(--c-muted)', fontSize: 13 }}>{metadataMessage}</div>}
        {status === 'success' && !newMemberPrompt && (
          <div className="admin-data-status admin-data-status--success" role="status">Transaction saved.</div>
        )}
        {status === 'error' && (
          <div className="admin-data-status admin-data-status--error" role="alert">{errMsg}</div>
        )}
      </form>

      {newMemberPrompt && (
        <div className="admin-dialog-backdrop" style={{ position: 'fixed' }}>
          <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="new-member-title">
            <div className="admin-dialog-header">
              <div>
                <h2 id="new-member-title">New member created</h2>
                <p className="admin-mono">{newMemberPrompt.name}</p>
              </div>
              <button type="button" className="admin-icon-button" aria-label="Close" onClick={skipMemberDetails} disabled={memberDetailStatus === 'saving'}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--c-muted)', fontSize: 13, marginBottom: 12 }}>
              Your transaction is saved and linked to this new profile. You can add member details now or skip this step.
            </p>
            <form onSubmit={saveMemberDetails} style={{ display: 'grid', gap: 12 }}>
              <div className="form-grid-2">
                <div>
                  <label style={lbl}>Phone</label>
                  <input type="tel" maxLength={50} value={memberDetailForm.phone} onChange={e => setMemberDetailForm(f => ({ ...f, phone: e.target.value }))} {...inp()} />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" maxLength={254} value={memberDetailForm.email} onChange={e => setMemberDetailForm(f => ({ ...f, email: e.target.value }))} {...inp()} />
                </div>
              </div>
              <div>
                <label style={lbl}>Area</label>
                <select disabled={metadataStatus !== 'ready'} value={memberDetailForm.areaId} onChange={e => setMemberDetailForm(f => ({ ...f, areaId: e.target.value }))} {...inp()}>
                  <option value="">— Select area —</option>
                  {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-member-monthly-amount" style={lbl}>Monthly amount (Taka, optional)</label>
                <input
                  id="new-member-monthly-amount"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  value={memberDetailForm.monthlyAmount}
                  onChange={event => setMemberDetailForm(current => ({ ...current, monthlyAmount: event.target.value }))}
                  aria-describedby={newMemberPrompt.paymentTransactionId ? 'new-member-monthly-amount-help' : undefined}
                  {...inp()}
                />
                {newMemberPrompt.paymentTransactionId && (
                  <small id="new-member-monthly-amount-help" className="transaction-member-search-status">
                    Enter an amount to apply the payment to the selected months in order. Leave it blank to keep the even split.
                  </small>
                )}
              </div>
              <div>
                <label style={lbl}>Address</label>
                <textarea rows={2} maxLength={1000} value={memberDetailForm.address} onChange={e => setMemberDetailForm(f => ({ ...f, address: e.target.value }))}
                  style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--c-border-strong)', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical', background: 'var(--c-surface)', color: 'var(--c-ink)' }} />
              </div>
              {memberDetailError && <div className="admin-data-status admin-data-status--error" role="alert">{memberDetailError}</div>}
              <div className="admin-dialog-actions">
                <button type="button" className="admin-button admin-button--quiet" onClick={skipMemberDetails} disabled={memberDetailStatus === 'saving'}>Skip</button>
                <button type="submit" className="admin-button admin-button--primary" disabled={memberDetailStatus === 'saving' || metadataStatus !== 'ready'}>{memberDetailStatus === 'saving' ? 'Saving…' : 'Save details'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </ChartShell>
  )
}

// ── Login Screen ──
function LoginScreen({ onLogin, error }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await onLogin(pin)
    setLoading(false)
    if (!result.success) setPin('')
  }

  return (
    <section className="admin-signin">
      <div className="admin-signin__icon"><LockKeyhole size={23} aria-hidden="true" /></div>
      <PageHeading title="Admin sign in" description="Enter your PIN to access the mosque workspace." />
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Access PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            onChange={event => setPin(event.target.value)}
            required
          />
        </label>
        {error && <div className="admin-data-status admin-data-status--error" role="alert">{error}</div>}
        <button type="submit" className="admin-button admin-button--primary" disabled={loading}>
          {loading ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

// ── Collector Dashboard ──
function CollectorDashboard({ data, status, error, onRetry, onLogout }) {
  if (status === 'loading') {
    return <div role="status" style={{ color: 'var(--c-muted-2)', textAlign: 'center', padding: 40 }}>Loading collection data…</div>
  }
  if (status === 'error') {
    return (
      <div role="alert" style={{ display: 'grid', justifyItems: 'center', gap: 12, color: 'var(--c-expense)', textAlign: 'center', padding: 40 }}>
        <span>We couldn’t load your collections. {error}</span>
        <button type="button" className="admin-button admin-button--quiet" onClick={onRetry}>Try again</button>
      </div>
    )
  }
  if (!data?.collectors) return <div style={{ color: 'var(--c-muted-2)', textAlign: 'center', padding: 40 }}>No collection data available.</div>

  const myName = data.collectors[0]?.name || 'Unknown'
  const myData = data.collectors.find(c => c.name === myName) || data.collectors[0]

  return (
    <div className="page">
      <PageHeading title={`Collector: ${myName}`} description="Review your collections and record transactions." action={
        <button type="button" className="admin-button admin-button--quiet" onClick={onLogout}>
          <LogOut size={17} aria-hidden="true" /> Sign out
        </button>
      } />
      <div className="chart-grid-3">
        <Kpi label="Total income" value={formatTaka(myData.income)} color={COLORS.income} icon={<ArrowDownLeft size={20} aria-hidden="true" />} />
        <Kpi label="Transactions" value={myData.count} icon={<List size={20} aria-hidden="true" />} />
        <Kpi label="Average per entry" value={formatTaka(myData.count ? myData.income / myData.count : 0)} color={COLORS.balance} icon={<Calculator size={20} aria-hidden="true" />} />
      </div>

      <TransactionForm enteredBy={myName} />

      <ChartShell title="Your transactions" subtitle="Recent entries you recorded">
        <TableShell data={myData.transactions?.slice(0, 20)} columns={[
          { header: 'Date', key: 'date' },
          { header: 'Category', key: 'category' },
          { header: 'Amount', key: 'amount', align: 'right', render: row => <strong style={{ color: COLORS.income }}>{formatTaka(row.amount)}</strong> },
          { header: 'Note', key: 'note' },
        ]} />
      </ChartShell>
    </div>
  )
}

// ── Main Admin Page ──
export default function Admin() {
  const { loading, authenticated, role, error: authError, login, logout } = useAuth()
  const { data, status: collectorStatus, error: collectorError, refetch: refetchCollectorData } = useCollectorData({ enabled: authenticated && role === 'collector' })
  const [loginError, setLoginError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const signOut = async () => {
    setLogoutError('')
    try {
      await logout()
      setLoginError('')
    } catch (error) {
      setLogoutError(getRequestErrorMessage(error))
    }
  }
  const logoutNotice = logoutError && <div className="admin-data-status admin-data-status--error" role="alert">{logoutError}</div>
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: '4px solid var(--c-primary-soft)', borderTopColor: 'var(--c-income)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--c-muted-2)' }}>Checking access…</div>
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onLogin={async (pin) => {
      const result = await login(pin)
      if (!result.success) setLoginError(result.error)
      return result
    }} error={loginError || authError} />
  }

  if (role === 'collector') {
    return (
      <>
        {logoutNotice}
        <CollectorDashboard
          data={data}
          status={collectorStatus}
          error={collectorError}
          onRetry={refetchCollectorData}
          onLogout={signOut}
        />
      </>
    )
  }
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/overview" replace />
  }
  return (
    <>
      {logoutNotice}
      <AdminWorkspace onLogout={signOut} transactionForm={<TransactionForm enteredBy="Admin" />} />
    </>
  )
}
