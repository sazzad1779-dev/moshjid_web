import React, { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, CalendarDays, ChevronRight, LayoutDashboard, LogOut,
  Menu, Settings, Users, X,
} from 'lucide-react'
import AdminOverview from './admin/AdminOverview.jsx'
import AdminMembers from './admin/AdminMembers.jsx'
import AdminTransactions from './admin/AdminTransactions.jsx'
import AdminDonations from './admin/AdminDonations.jsx'
import AdminSettings from './admin/AdminSettings.jsx'
import { INITIAL_SETTINGS } from './admin/AdminShared.jsx'
import './AdminWorkspace.css'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'donations', label: 'Monthly dues', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function AdminWorkspace({ onLogout, transactionForm }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [settings, setSettings] = useState(INITIAL_SETTINGS)

  const location = useLocation()
  const navigate = useNavigate()
  const activeItem = NAV_ITEMS.find(item => location.pathname === `/admin/${item.id}`) || NAV_ITEMS[0]
  const navigateToPage = id => {
    navigate(`/admin/${id}`)
    setMobileNavOpen(false)
  }

  return (
    <div className="admin-workspace">
      <aside className={`admin-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark"><img src="/mosque-logo.svg" alt="" /></div>
          <div><strong>Masjid Admin</strong><span>Management portal</span></div>
          <button className="admin-mobile-close admin-icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="admin-nav-caption">WORKSPACE</div>
        <nav className="admin-side-nav" aria-label="Admin pages">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <NavLink key={id} to={`/admin/${id}`} end className={({ isActive }) => isActive ? 'is-active' : ''} onClick={() => setMobileNavOpen(false)}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-profile-card"><span className="admin-profile-avatar">A</span><span><strong>Administrator</strong><small>Full access</small></span><span className="admin-online-dot" /></div>
          <button className="admin-logout" onClick={onLogout}><LogOut size={17} />Sign out</button>
        </div>
      </aside>
      {mobileNavOpen && <button className="admin-sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="admin-main">
        <div className="admin-content">
          <Routes>
            <Route path="overview" element={<AdminOverview onNavigate={navigateToPage} />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="transactions" element={<AdminTransactions transactionForm={transactionForm} />} />
            <Route path="donations" element={<AdminDonations />} />
            <Route path="settings" element={<AdminSettings settings={settings} setSettings={setSettings} />} />
            <Route path="*" element={<Navigate to="/admin/overview" replace />} />
          </Routes>
        </div>
        <footer className="admin-footer"><span>Masjid administration</span><span>Secure · {new Date().getFullYear()}</span></footer>
      </main>
    </div>
  )
}
