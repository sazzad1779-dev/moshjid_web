import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import ChartShell from '../components/ChartShell.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useCollectorData } from '../hooks/useCollectorData.js'
import useMetadata from '../hooks/useMetadata.js'
import { formatTaka, formatDate } from '../utils/formatters.js'
import { COLORS } from '../constants.js'
import AdminWorkspace from './AdminWorkspace.jsx'

const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

// ── Transaction Form ──
function TransactionForm({ enteredBy, onSaved }) {
  const { role } = useAuth()
  const empty = { date: new Date().toISOString().split('T')[0], type: 'income', category: '', description: '', amount: '', paymentMethod: '', notes: '', donorName: '', memberId: '' }
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
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
        setMemberSuggestions(result.rows || [])
        setMemberSearchStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMemberSuggestions([])
          setMemberSearchError(error.message || 'Failed to search members.')
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
  const paymentMethods = metadata?.paymentMethods || []
  const selectedPaymentMethod = paymentMethods.includes(form.paymentMethod) ? form.paymentMethod : paymentMethods[0] || ''
  const userStatuses = metadata?.userStatuses || []
  const areas = metadata?.areas || []
  const selectedMemberStatus = userStatuses.includes(memberDetailForm.status) ? memberDetailForm.status : userStatuses[0] || ''
  const metadataMessage = metadataStatus === 'loading'
    ? 'Loading database options…'
    : metadataStatus === 'error'
      ? `Could not load database options: ${metadataError}`
      : !transactionTypes.length
        ? 'No active transaction categories are configured.'
        : !paymentMethods.length
          ? 'No payment methods are configured.'
          : ''
  const canSubmit = metadataStatus === 'ready' && !metadataMessage && categories.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/add-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: selectedType, paymentMethod: selectedPaymentMethod, enteredBy })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus('success')
      setForm(empty)
      setMemberQuery('')
      setMemberSuggestions([])
      setDescriptionTouched(false)
      if (data?.newMember && data?.memberId) {
        setNewMemberPrompt({ id: data.memberId, name: (form.donorName || '').trim() })
        setMemberDetailForm({ phone: '', email: '', address: '', areaId: '', monthlyAmount: '', status: userStatuses[0] || 'active' })
      } else {
        onSaved?.()
        setTimeout(() => setStatus(null), 3000)
      }
    } catch (err) {
      setErrMsg(err.message)
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
          monthlyAmount: memberDetailForm.monthlyAmount,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      setNewMemberPrompt(null)
      setMemberDetailStatus('idle')
      onSaved?.()
      setTimeout(() => setStatus(null), 3000)
    } catch (saveError) {
      setMemberDetailError(saveError.message || 'Failed to save member details.')
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
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} {...inp()} />
          </div>
          <div>
            <label style={lbl}>Type / ধরন *</label>
            <select required disabled={!transactionTypes.length || metadataStatus !== 'ready'} value={selectedType} onChange={e => { set('type', e.target.value); set('category', '') }} {...inp()}>
              {transactionTypes.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Category / ক্যাটাগরি *</label>
          <select required disabled={!categories.length || metadataStatus !== 'ready'} value={form.category} onChange={e => set('category', e.target.value)} {...inp()}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Description / বিবরণ (optional)</label>
          <input type="text" placeholder="e.g. Friday donation" value={form.description} onChange={e => { set('description', e.target.value); setDescriptionTouched(true) }} {...inp()} />
        </div>

        <div>
          <label style={lbl}>{selectedType === 'income' ? 'Member / Donor Name (optional)' : 'Member / Payee Name (optional)'}</label>
          <div className="transaction-member-search">
            <input
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
          {memberSearchStatus === 'error' && <small className="transaction-member-search-status transaction-member-search-status--error" role="alert">Could not search members: {memberSearchError}</small>}
          {form.memberId && <small className="transaction-member-search-status">Selected member will be linked to this transaction.</small>}
        </div>

        <div className="form-grid-2">
          <div>
            <label style={lbl}>Amount (Taka) / পরিমাণ *</label>
            <input type="number" required min="1" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} {...inp()} />
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
          <div style={{ padding: '12px 14px', background: 'var(--tint-income)', borderRadius: 10, color: 'var(--c-income)', fontWeight: 600, fontSize: 13 }}>
            ✅ Transaction saved successfully!
          </div>
        )}
        {status === 'error' && (
          <div style={{ padding: '12px 14px', background: 'var(--tint-expense)', borderRadius: 10, color: 'var(--c-expense)', fontWeight: 600, fontSize: 13 }}>
            ❌ {errMsg}
          </div>
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
              This name was not in the member list, so a member profile was created. Add more details now (optional).
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
              <div className="form-grid-2">
                <div>
                  <label style={lbl}>Area</label>
                  <select disabled={metadataStatus !== 'ready'} value={memberDetailForm.areaId} onChange={e => setMemberDetailForm(f => ({ ...f, areaId: e.target.value }))} {...inp()}>
                    <option value="">— Select area —</option>
                    {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Monthly amount</label>
                  <input type="number" min="0" step="0.01" value={memberDetailForm.monthlyAmount} onChange={e => setMemberDetailForm(f => ({ ...f, monthlyAmount: e.target.value }))} {...inp()} />
                </div>
              </div>
              <div>
                <label style={lbl}>Address</label>
                <textarea rows={2} maxLength={1000} value={memberDetailForm.address} onChange={e => setMemberDetailForm(f => ({ ...f, address: e.target.value }))}
                  style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--c-border-strong)', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical', background: 'var(--c-surface)', color: 'var(--c-ink)' }} />
              </div>
              {memberDetailError && <div style={{ color: 'var(--c-expense)', fontSize: 13 }}>{memberDetailError}</div>}
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
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title="Admin Access" subtitle="Restricted area — PIN required">
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '20px 10px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-ink)' }}>Mosque Admin Panel</div>
            <div style={{ fontSize: 13, color: 'var(--c-muted-2)', marginTop: 6 }}>Enter your PIN to continue</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              required
              style={{
                padding: '14px 16px', borderRadius: 12, border: '1px solid var(--c-border-strong)',
                fontSize: 18, textAlign: 'center', letterSpacing: '0.3em',
                outline: 'none', fontWeight: 700, background: 'var(--c-surface)', color: 'var(--c-ink)'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-border-strong)'}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 'none', borderRadius: 12, padding: '14px 16px',
                background: loading ? 'var(--c-muted-2)' : 'var(--c-primary-button)', color: 'var(--c-on-primary)',
                fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 15
              }}
            >
              {loading ? 'Verifying…' : 'Continue to Admin Panel'}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: 14, padding: '12px 14px', background: 'var(--tint-expense)',
              borderRadius: 10, color: 'var(--c-expense)', fontWeight: 600, fontSize: 13, textAlign: 'center'
            }}>
              {error}
            </div>
          )}
        </div>
      </ChartShell>
    </div>
  )
}

// ── Collector Dashboard ──
function CollectorDashboard({ data, onLogout }) {
  if (!data?.collectors) return <div style={{ color: 'var(--c-muted-2)', textAlign: 'center', padding: 40 }}>No data</div>

  const myName = data.collectors[0]?.name || 'Unknown'
  const myData = data.collectors.find(c => c.name === myName) || data.collectors[0]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title={`Collector: ${myName}`} subtitle="Your collection summary">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ color: 'var(--c-muted)', fontSize: 14 }}>View your collection summary and recent entries.</div>
          <button onClick={onLogout} style={{
            border: '1px solid var(--c-border-strong)', borderRadius: 10, padding: '10px 16px',
            background: 'var(--c-surface)', cursor: 'pointer', fontWeight: 700, color: 'var(--c-expense)', fontSize: 13
          }}>
            Sign Out
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ background: 'var(--c-surface-2)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--c-muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Income</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.income, marginTop: 8 }}>{formatTaka(myData.income)}</div>
          </div>
          <div style={{ background: 'var(--c-surface-2)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--c-muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-ink)', marginTop: 8 }}>{myData.count}</div>
          </div>
          <div style={{ background: 'var(--c-surface-2)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--c-muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg per Entry</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.balance, marginTop: 8 }}>{formatTaka(myData.count ? myData.income / myData.count : 0)}</div>
          </div>
        </div>
      </ChartShell>

      <TransactionForm enteredBy={myName} />

      <ChartShell title="Your Transactions" subtitle="Recent entries you recorded">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--c-border-strong)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--c-muted)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--c-muted)', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: 'var(--c-muted)', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--c-muted)', textTransform: 'uppercase' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {myData.transactions?.slice(0, 20).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '12px 14px', color: 'var(--c-ink-2)' }}>{t.date}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--c-ink-2)' }}>{t.category}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: COLORS.income }}>{formatTaka(t.amount)}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--c-muted)', fontSize: 13 }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartShell>
    </div>
  )
}

// ── Main Admin Page ──
export default function Admin() {
  const { loading, authenticated, role, login, logout } = useAuth()
  const { data } = useCollectorData({ enabled: authenticated && role === 'collector' })
  const [loginError, setLoginError] = useState('')
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
    }} error={loginError} />
  }

  if (role === 'collector') return <CollectorDashboard data={data} onLogout={logout} />
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/overview" replace />
  }
  return <AdminWorkspace onLogout={logout} transactionForm={<TransactionForm enteredBy="Admin" />} />
}
