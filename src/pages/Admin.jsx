import React, { useState } from 'react'
import ChartShell from '../components/ChartShell.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useCollectorData } from '../hooks/useCollectorData.js'
import { formatTaka } from '../utils/formatters.js'
import { COLORS } from '../constants.js'

const INCOME_CATEGORIES = ['Regular Donation', 'Friday Collection', 'Zakat', 'Sadaqah', 'Special Donation', 'Other Income']
const EXPENSE_CATEGORIES = ['Electricity Bill', 'Water Bill', 'Maintenance', 'Salary', 'Cleaning', 'Stationery', 'Other Expense']
const PAYMENT_METHODS = ['Cash (নগদ)', 'Bank Transfer (ব্যাংক ট্রান্সফার)', 'bKash (বিকাশ)', 'Nagad (নগদ)', 'Rocket (রকেট)', 'Check (চেক)']

const NOTES = [
  'Confirm the member list before publishing any collection summary.',
  'Never share your PIN with anyone. Contact admin if you suspect compromise.',
]

const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#506174', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

// ── Transaction Form ──
function TransactionForm({ enteredBy }) {
  const empty = { date: new Date().toISOString().split('T')[0], type: 'income', category: '', description: '', amount: '', paymentMethod: 'Cash (নগদ)', notes: '', donorName: '' }
  const [form, setForm] = useState(empty)
  const [status, setStatus] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/add-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, enteredBy })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus('success')
      setForm(empty)
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setErrMsg(err.message)
      setStatus('error')
    }
  }

  const inp = (extra = {}) => ({
    style: { padding: '11px 14px', borderRadius: 10, border: '1px solid #d5dde5', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', background: '#fff' },
    onFocus: e => e.target.style.borderColor = '#1d4f2f',
    onBlur: e => e.target.style.borderColor = '#d5dde5',
    ...extra
  })

  return (
    <ChartShell title="Add Transaction" subtitle="লেনদেন যোগ করুন">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, maxWidth: 600 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Date / তারিখ *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} {...inp()} />
          </div>
          <div>
            <label style={lbl}>Type / ধরন *</label>
            <select required value={form.type} onChange={e => { set('type', e.target.value); set('category', '') }} {...inp()}>
              <option value="income">Income (জমা)</option>
              <option value="expense">Expense (খরচ)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Category / ক্যাটাগরি *</label>
          <select required value={form.category} onChange={e => set('category', e.target.value)} {...inp()}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Description / বিবরণ *</label>
          <input type="text" required placeholder="e.g. Friday donation" value={form.description} onChange={e => set('description', e.target.value)} {...inp()} />
        </div>

        <div>
          <label style={lbl}>{form.type === 'income' ? 'Donor Name / দাতার নাম *' : 'Payee Name / প্রাপকের নাম *'}</label>
          <input type="text" required placeholder={form.type === 'income' ? 'e.g. Abdur Rahman' : 'e.g. DESCO Bill'} value={form.donorName} onChange={e => set('donorName', e.target.value)} {...inp()} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Amount (Taka) / পরিমাণ *</label>
            <input type="number" required min="1" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} {...inp()} />
          </div>
          <div>
            <label style={lbl}>Payment Method *</label>
            <select required value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} {...inp()}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Additional Notes / অতিরিক্ত মন্তব্য</label>
          <textarea rows={2} placeholder="Optional extra details…" value={form.notes} onChange={e => set('notes', e.target.value)}
            style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #d5dde5', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical', background: '#fff' }}
            onFocus={e => e.target.style.borderColor = '#1d4f2f'}
            onBlur={e => e.target.style.borderColor = '#d5dde5'}
          />
        </div>

        <button type="submit" disabled={status === 'loading'} style={{
          border: 'none', borderRadius: 12, padding: '13px 20px',
          background: status === 'loading' ? '#a0b0a0' : '#1d4f2f',
          color: '#fff', fontWeight: 700, cursor: status === 'loading' ? 'wait' : 'pointer', fontSize: 15
        }}>
          {status === 'loading' ? 'Saving…' : 'Save Transaction'}
        </button>

        {status === 'success' && (
          <div style={{ padding: '12px 14px', background: '#e8f5e9', borderRadius: 10, color: '#2E7D32', fontWeight: 600, fontSize: 13 }}>
            ✅ Transaction saved successfully!
          </div>
        )}
        {status === 'error' && (
          <div style={{ padding: '12px 14px', background: '#ffebee', borderRadius: 10, color: '#c62828', fontWeight: 600, fontSize: 13 }}>
            ❌ {errMsg}
          </div>
        )}
      </form>
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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#213143' }}>Mosque Admin Panel</div>
            <div style={{ fontSize: 13, color: '#8898aa', marginTop: 6 }}>Enter your PIN to continue</div>
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
                padding: '14px 16px', borderRadius: 12, border: '1px solid #d5dde5',
                fontSize: 18, textAlign: 'center', letterSpacing: '0.3em',
                outline: 'none', fontWeight: 700
              }}
              onFocus={e => e.target.style.borderColor = '#1d4f2f'}
              onBlur={e => e.target.style.borderColor = '#d5dde5'}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 'none', borderRadius: 12, padding: '14px 16px',
                background: loading ? '#a0b0a0' : '#1d4f2f', color: '#fff',
                fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 15
              }}
            >
              {loading ? 'Verifying…' : 'Continue to Admin Panel'}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: 14, padding: '12px 14px', background: '#ffebee',
              borderRadius: 10, color: '#c62828', fontWeight: 600, fontSize: 13, textAlign: 'center'
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
  if (!data?.collectors) return <div style={{ color: '#8898aa', textAlign: 'center', padding: 40 }}>No data</div>

  const myName = data.collectors[0]?.name || 'Unknown'
  const myData = data.collectors.find(c => c.name === myName) || data.collectors[0]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title={`Collector: ${myName}`} subtitle="Your collection summary">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ color: '#5f6b7a', fontSize: 14 }}>View your collection summary and recent entries.</div>
          <button onClick={onLogout} style={{
            border: '1px solid #d5dde5', borderRadius: 10, padding: '10px 16px',
            background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#c62828', fontSize: 13
          }}>
            Sign Out
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', border: '1px solid #eef2f5' }}>
            <div style={{ fontSize: 11, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Income</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.income, marginTop: 8 }}>{formatTaka(myData.income)}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', border: '1px solid #eef2f5' }}>
            <div style={{ fontSize: 11, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#213143', marginTop: 8 }}>{myData.count}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', border: '1px solid #eef2f5' }}>
            <div style={{ fontSize: 11, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg per Entry</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.balance, marginTop: 8 }}>{formatTaka(myData.count ? myData.income / myData.count : 0)}</div>
          </div>
        </div>
      </ChartShell>

      <TransactionForm enteredBy={myName} />

      <ChartShell title="Your Transactions" subtitle="Recent entries you recorded">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e8ecef' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#506174', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#506174', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: '#506174', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#506174', textTransform: 'uppercase' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {myData.transactions?.slice(0, 20).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '12px 14px', color: '#344150' }}>{t.date}</td>
                  <td style={{ padding: '12px 14px', color: '#344150' }}>{t.category}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: COLORS.income }}>{formatTaka(t.amount)}</td>
                  <td style={{ padding: '12px 14px', color: '#5f6b7a', fontSize: 13 }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartShell>
    </div>
  )
}

// ── Admin Dashboard ──
function AdminDashboard({ data, onLogout }) {
  const collectors = data?.collectors || []
  const totalIncome = collectors.reduce((s, c) => s + c.income, 0)
  const totalExpense = collectors.reduce((s, c) => s + c.expense, 0)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title="Admin Panel" subtitle="Full mosque administration">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ color: '#5f6b7a', fontSize: 14 }}>Manage collectors, view all collections, and add transactions.</div>
          <button onClick={onLogout} style={{
            border: '1px solid #d5dde5', borderRadius: 10, padding: '10px 16px',
            background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#c62828', fontSize: 13
          }}>
            Sign Out
          </button>
        </div>
      </ChartShell>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Collectors', value: collectors.length, color: '#213143' },
          { label: 'Total Income', value: formatTaka(totalIncome), color: COLORS.income },
          { label: 'Total Expense', value: formatTaka(totalExpense), color: COLORS.expense },
          { label: 'Balance', value: formatTaka(totalIncome - totalExpense), color: totalIncome >= totalExpense ? COLORS.balance : COLORS.expense },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5' }}>
            <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 8 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <TransactionForm enteredBy="Admin" />

      {/* Collector-wise Summary */}
      <ChartShell title="Collector-wise Collections" subtitle="Summary by person">
        <div style={{ display: 'grid', gap: 12 }}>
          {collectors.map(c => {
            const pct = c.income > 0 ? Math.min(100, Math.round((c.income / Math.max(...collectors.map(x => x.income))) * 100)) : 0
            return (
              <div key={c.name} style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #eef2f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, color: '#213143' }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: '#8898aa' }}>{c.count} entries</div>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: '#e8edf3', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: COLORS.income, borderRadius: 999, transition: 'width 0.6s' }} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5f6b7a' }}>
                  <span>Income: <strong style={{ color: COLORS.income }}>{formatTaka(c.income)}</strong></span>
                  <span>Expense: <strong style={{ color: COLORS.expense }}>{formatTaka(c.expense)}</strong></span>
                </div>
              </div>
            )
          })}
        </div>
      </ChartShell>

      <ChartShell title="Internal Notes" subtitle="Administrative reminders">
        <ul style={{ margin: 0, paddingLeft: 20, color: '#344150', lineHeight: 1.8 }}>
          {NOTES.map((note, i) => <li key={i}>{note}</li>)}
        </ul>
      </ChartShell>
    </div>
  )
}

// ── Main Admin Page ──
export default function Admin() {
  const { loading, authenticated, role, login, logout } = useAuth()
  const { data } = useCollectorData()
  const [loginError, setLoginError] = useState('')

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: '4px solid #e8f5e9', borderTopColor: '#2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#8898aa' }}>Checking access…</div>
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
  return <AdminDashboard data={data} onLogout={logout} />
}
