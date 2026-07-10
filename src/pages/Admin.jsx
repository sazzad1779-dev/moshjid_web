import React, { useState } from 'react'
import ChartShell from '../components/ChartShell.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useCollectorData } from '../hooks/useCollectorData.js'
import { formatTaka } from '../utils/formatters.js'
import { COLORS } from '../constants.js'

// ── Config (from env) ──
const CONTACT_EMAIL = import.meta.env.VITE_ADMIN_CONTACT_EMAIL || 'admin@mosque.com'

const QUICK_LINKS = [
  {
    title: 'Income Collection Form',
    url: import.meta.env.VITE_INCOME_FORM_URL || '#',
    desc: 'Google form for monthly income collection',
  },
  {
    title: 'Member Collection Sheet',
    url: import.meta.env.VITE_MEMBER_SHEET_URL || '#',
    desc: 'Member-wise collection tracker',
  },
  {
    title: 'Expense Entry Form',
    url: import.meta.env.VITE_EXPENSE_FORM_URL || '#',
    desc: 'Submit new expense entries',
  },
]

const NOTES = [
  'Keep all online collection screenshots in the shared folder after every submission.',
  'Confirm the member list before publishing any collection summary.',
  'Use the official form to avoid duplicate entries and mismatch in records.',
  'Never share your PIN with anyone. Contact admin if you suspect compromise.',
]

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

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#8898aa' }}>
            Need access? Contact{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#1d4f2f', fontWeight: 700 }}>{CONTACT_EMAIL}</a>
          </div>
        </div>
      </ChartShell>
    </div>
  )
}

// ── Collector Dashboard ──
function CollectorDashboard({ data }) {
  if (!data?.collectors) return <div style={{ color: '#8898aa', textAlign: 'center', padding: 40 }}>No data</div>

  const myName = data.collectors[0]?.name || 'Unknown'
  const myData = data.collectors.find(c => c.name === myName) || data.collectors[0]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <ChartShell title={`Collector: ${myName}`} subtitle="Your collection summary">
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
      {/* Header */}
      <ChartShell title="Admin Panel" subtitle="Full mosque administration">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ color: '#5f6b7a', fontSize: 14 }}>Manage collectors, view all collections, and access admin resources.</div>
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
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5' }}>
          <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase' }}>Collectors</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#213143', marginTop: 8 }}>{collectors.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5' }}>
          <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Income</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.income, marginTop: 8 }}>{formatTaka(totalIncome)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5' }}>
          <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Expense</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.expense, marginTop: 8 }}>{formatTaka(totalExpense)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5' }}>
          <div style={{ fontSize: 12, color: '#8898aa', fontWeight: 700, textTransform: 'uppercase' }}>Balance</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: totalIncome >= totalExpense ? COLORS.balance : COLORS.expense, marginTop: 8 }}>{formatTaka(totalIncome - totalExpense)}</div>
        </div>
      </div>

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

      {/* Quick Links */}
      <ChartShell title="Quick Links" subtitle="Admin resources">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {QUICK_LINKS.map(link => (
            <a key={link.title} href={link.url} target="_blank" rel="noreferrer" style={{
              background: '#f8fafc', border: '1px solid #e8edf3', borderRadius: 14,
              padding: '18px 20px', textDecoration: 'none', color: '#213143',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontWeight: 800, color: '#1d4f2f', marginBottom: 6 }}>{link.title}</div>
              <div style={{ fontSize: 13, color: '#5f6b7a', lineHeight: 1.6 }}>{link.desc}</div>
            </a>
          ))}
        </div>
      </ChartShell>

      {/* Notes */}
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
  const { data, status, error } = useCollectorData()
  const [loginError, setLoginError] = useState('')

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e8f5e9', borderTopColor: '#2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  // Collector sees only their own data
  if (role === 'collector') {
    return <CollectorDashboard data={data} />
  }

  // Admin sees everything
  return <AdminDashboard data={data} onLogout={logout} />
}
