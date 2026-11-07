import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import PageLoader from './components/PageLoader.jsx'
import Hero from './components/Hero.jsx'
import { TransactionsProvider, useTransactions } from './hooks/useTransactions.js'
import { formatTaka } from './utils/formatters.js'

const Home = lazy(() => import('./pages/Home.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Monthly = lazy(() => import('./pages/Monthly.jsx'))
const Transactions = lazy(() => import('./pages/Transactions.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

function PublicPages() {
  const { rows, status, error, summary, categories, refetch } = useTransactions()

  if (status === 'loading') {
    return <PageLoader />
  }

  return (
    <>
      <Hero balance={summary.balance} totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} />
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
  return (
    <TransactionsProvider>
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
