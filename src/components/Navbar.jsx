import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/monthly', label: 'Monthly' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/admin', label: 'Admin' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const drawerRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const linkClass = ({ isActive }) => `nv-link${isActive ? ' nv-link--active' : ''}`

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
