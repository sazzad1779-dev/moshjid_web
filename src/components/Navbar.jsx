import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Monitor, Moon, Sun } from 'lucide-react'

const THEME_KEY = 'mosque-finance-theme'
const THEME_MODES = ['system', 'light', 'dark']

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/monthly', label: 'Monthly' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/admin', label: 'Admin' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY)
    return THEME_MODES.includes(savedTheme) ? savedTheme : 'system'
  })
  const location = useLocation()
  const drawerRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.dataset.theme =
        themeMode === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themeMode
    }

    applyTheme()
    systemTheme.addEventListener('change', applyTheme)
    return () => systemTheme.removeEventListener('change', applyTheme)
  }, [themeMode])

  const cycleTheme = () => {
    const nextTheme = THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length]
    window.localStorage.setItem(THEME_KEY, nextTheme)
    setThemeMode(nextTheme)
  }

  const linkClass = ({ isActive }) => `nv-link${isActive ? ' nv-link--active' : ''}`
  const themeIcon = themeMode === 'system' ? Monitor : themeMode === 'dark' ? Moon : Sun
  const nextTheme = THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length]
  const ThemeIcon = themeIcon

  return (
    <>
      <header className="nv">
        <div className="nv__inner">
          <NavLink to="/" className="nv__brand" end onClick={() => setOpen(false)}>
            <img src="/mosque-logo.svg" alt="" className="nv__logo" />
            <span className="nv__name">
              <span className="nv__name-en">Madhya Beparipara Jame Masjid</span>
              <span className="nv__name-bn">মধ্য বেপারীপাড়া মোহাম্মদিয়া জামে মসজিদ</span>
            </span>
          </NavLink>

          <div className="nv__actions">
            <nav className="nv__desktop">
              {LINKS.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={linkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              className="nv__theme-toggle"
              onClick={cycleTheme}
              aria-label={`Theme: ${themeMode}. Switch to ${nextTheme} theme`}
              title={`Theme: ${themeMode} · click for ${nextTheme}`}
            >
              <ThemeIcon size={18} aria-hidden="true" />
              <span className="sr-only">Theme: {themeMode}</span>
            </button>

            <button
              className={`nv__burger${open ? ' nv__burger--open' : ''}`}
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {open && <div className="nv__overlay" onClick={() => setOpen(false)} />}

      <aside ref={drawerRef} className={`nv__drawer${open ? ' nv__drawer--open' : ''}`}>
        <nav className="nv__drawer-links">
          {LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
