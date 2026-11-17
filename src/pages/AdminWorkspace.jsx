import React, { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, CalendarDays, LayoutDashboard, LogOut, Settings, Users,
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
  const [settings, setSettings] = useState(INITIAL_SETTINGS)

  const navigate = useNavigate()

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>Administration</span>
          <button type="button" className="admin-logout" onClick={onLogout}>
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </div>
        <nav className="admin-side-nav" aria-label="Admin pages">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <NavLink key={id} to={`/admin/${id}`} end className={({ isActive }) => isActive ? 'is-active' : ''}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <div className="admin-content">
          <Routes>
            <Route path="overview" element={<AdminOverview onNavigate={id => navigate(`/admin/${id}`)} />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="transactions" element={<AdminTransactions transactionForm={transactionForm} />} />
            <Route path="donations" element={<AdminDonations />} />
            <Route path="settings" element={<AdminSettings settings={settings} setSettings={setSettings} />} />
            <Route path="*" element={<Navigate to="/admin/overview" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
