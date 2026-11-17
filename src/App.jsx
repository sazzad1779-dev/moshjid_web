import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import PageLoader from './components/PageLoader.jsx'
import Hero from './components/Hero.jsx'
import PrayerTimes from './components/PrayerTimes.jsx'
import { TransactionsProvider, useTransactions } from './hooks/useTransactions.js'
import PageHeading from './components/PageHeading.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Monthly = lazy(() => import('./pages/Monthly.jsx'))
const Transactions = lazy(() => import('./pages/Transactions.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

const PUBLIC_HEADINGS = {
  '/dashboard': { title: 'Finance dashboard', description: 'Track income, expenses, and the mosque’s available balance.' },
  '/monthly': { title: 'Monthly review', description: 'Explore income, spending, and activity for a selected month.' },
  '/transactions': { title: 'Transactions', description: 'Search and filter the mosque’s public financial records.' },
}

function PublicPages() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const heading = PUBLIC_HEADINGS[pathname.replace(/\/$/, '').toLowerCase()]
  const { rows, status, error, summary, categories, refetch } = useTransactions()

  if (status === 'loading') {
    return <>{heading && <PageHeading {...heading} />}{isHome && <PrayerTimes />}<PageLoader /></>
  }

  if (status === 'error' && !rows.length) {
    return (
      <>
        <PageHeading {...(heading || { title: 'Mosque finance' })} />
        {isHome && <PrayerTimes />}
        <div className="page-error" role="alert">
          <h2>We couldn’t load the mosque finance data</h2>
          <p>{error}</p>
          <button type="button" onClick={refetch}>Try again</button>
        </div>
      </>
    )
  }

  return (
    <>
      {heading ? <PageHeading {...heading} /> : <Hero {...summary} />}
      {isHome && <PrayerTimes />}
      {status === 'error' && (
        <div className="page-error page-error--inline" role="alert">
          <span>Couldn’t refresh the data: {error}</span>
          <button type="button" onClick={refetch}>Try again</button>
        </div>
      )}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home rows={rows} summary={summary} categories={categories} />} />
          <Route path="/dashboard" element={<Dashboard rows={rows} summary={summary} categories={categories} />} />
          <Route path="/monthly" element={<Monthly rows={rows} summary={summary} categories={categories} />} />
          <Route path="/transactions" element={<Transactions rows={rows} summary={summary} categories={categories} />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <TransactionsProvider enabled={!pathname.startsWith('/admin')}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/admin/*" element={
            <Suspense fallback={<PageLoader />}>
              <Admin />
            </Suspense>
          } />
          <Route path="/*" element={<PublicPages />} />
        </Route>
      </Routes>
    </TransactionsProvider>
  )
}
