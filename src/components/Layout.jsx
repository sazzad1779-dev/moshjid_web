import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <div className="app-container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
