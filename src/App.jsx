import React, { useState } from 'react'
import { useTransactions } from './hooks/useTransactions.js'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Monthly from './pages/Monthly.jsx'
import Transactions from './pages/Transactions.jsx'
import About from './pages/About.jsx'
import { formatTaka } from './utils/formatters.js'
import { TAB_ICONS } from './constants.js'

const TABS = [
  { id: 'home',    label: 'Home',        desc: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', desc: 'Analytics' },
  { id: 'monthly', label: 'Monthly',   desc: 'Finance' },
  { id: 'transactions', label: 'Transactions', desc: 'All Records' },
  { id: 'about',   label: 'About',     desc: 'Info' },
]

export default function App() {
  const { rows, status, error, summary, categories, refetch } = useTransactions()
  const [activeTab, setActiveTab] = useState('home')

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f8f1' }}>
        <div style={{ textAlign: 'center' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ width: 48, height: 48, border: '4px solid #e8f5e9', borderTopColor: '#2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: '#5f6b7a', fontWeight: 600 }}>Loading mosque finance data…</div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f8f1', padding: 20 }}>
        <div style={{ maxWidth: 480, textAlign: 'center', background: '#fff', borderRadius: 18, padding: '32px 28px', boxShadow: '0 14px 34px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: 24, color: '#213143' }}>Setup Needed</h2>
          <p style={{ marginTop: 10, color: '#5f6b7a', lineHeight: 1.7 }}>
            Couldn't load the sheet: <strong>{error}</strong>
            <br /><br />
            Make sure your <code>SHEET_CSV_URL</code> environment variable is set in Vercel, then refresh.
          </p>
          <button onClick={refetch} style={{ marginTop: 20, background: '#1d4f2f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { balance, totalIncome, totalExpense } = summary

  const tabContent = () => {
    const props = { rows, summary, categories }
    switch (activeTab) {
      case 'home': return <Home {...props} />
      case 'dashboard': return <Dashboard {...props} />
      case 'monthly': return <Monthly {...props} />
      case 'transactions': return <Transactions {...props} />
      case 'about': return <About />
      default: return <Home {...props} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f6ef 0%, #eef4ee 45%, #f8f3e6 100%)', padding: '24px 16px 50px', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .tab-content { animation: fadeIn 0.3s ease; }`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>

        {/* Hero */}
        <header style={{
          background: 'linear-gradient(120deg, #193f2a 0%, #2f6b3f 55%, #a67c2b 100%)',
          borderRadius: 24, padding: '32px 32px 28px', color: '#fff',
          display: 'flex', justifyContent: 'space-between', gap: 28, alignItems: 'center',
          boxShadow: '0 20px 45px rgba(22,49,33,0.24)', flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
            <img src="/mosque-logo.svg" alt="Mosque logo" style={{ width: 102, height: 100, borderRadius: 18, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', background: '#fff', padding: 6 }} />
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, color: '#d6e7d3', marginBottom: 10 }}>
                Madhya Beparipara Mohammadia Jame Masjid
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>মধ্য বেপারীপাড়া মোহাম্মদিয়া  জামে মসজিদ</h1>
              <p style={{ marginTop: 12, color: '#e9f5ea', maxWidth: 600, lineHeight: 1.6, fontSize: 15 }}>
                প্রতিটি টাকার হিসাব, আপনার আস্থা
              </p>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)', color: '#223041', borderRadius: 18,
            padding: '22px 24px', minWidth: 280, boxShadow: '0 12px 24px rgba(0,0,0,0.12)', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8a6a2b', fontWeight: 700 }}>Current Balance</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4f2f', marginTop: 8 }}>{formatTaka(balance)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#5f6b7a', fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: balance >= 0 ? '#2E7D32' : '#C62828' }} />
              {balance >= 0 ? 'Healthy financial standing' : 'Deficit — review needed'}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eef2f5', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#5f6b7a' }}>Income: <strong style={{ color: '#2E7D32' }}>{formatTaka(totalIncome)}</strong></span>
              <span style={{ color: '#5f6b7a' }}>Expense: <strong style={{ color: '#C62828' }}>{formatTaka(totalExpense)}</strong></span>
            </div>
          </div>
        </header>

        {/* Nav */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '8px 4px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none', borderRadius: 14, padding: '10px 18px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.25s ease', fontSize: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100,
                background: activeTab === tab.id ? '#1d4f2f' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#5f6b7a',
                boxShadow: activeTab === tab.id ? '0 8px 20px rgba(29,79,47,0.2)' : 'none',
              }}
            >
              <span style={{ fontSize: 18, marginBottom: 2 }}>{TAB_ICONS[tab.id]}</span>
              <span>{tab.label}</span>
              <span style={{ display: 'block', fontSize: 10, opacity: 0.7, marginTop: 2, fontWeight: 500 }}>{tab.desc}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="tab-content">{tabContent()}</main>

      </div>
    </div>
  )
}
