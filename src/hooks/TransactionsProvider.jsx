import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { computeSummary } from '../utils/computations.js'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage } from '../utils/requestErrors.js'

// Module-level cache shared across all provider instances (and remounts).
let cache = {
  rows: null,
  status: 'idle',
  error: null,
  lastUpdated: null,
}

function fetchTransactions() {
  return dedupeRequest('/api/transactions', async () => {
    const res = await fetch('/api/transactions', { signal: AbortSignal.timeout(12000) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    if (data.error) throw new Error(data.error)
    return data
  })
}

const TransactionsContext = createContext(null)

export function TransactionsProvider({ children, enabled = true }) {
  const [state, setState] = useState({
    rows: cache.rows || [],
    status: cache.rows ? 'ready' : cache.status === 'error' ? 'error' : 'loading',
    error: cache.error,
    lastUpdated: cache.lastUpdated,
  })

  const mountedRef = useRef(true)
  const fetchData = useCallback(async () => {
    if (!cache.rows) {
      setState(s => ({ ...s, status: 'loading', error: null }))
    } else {
      setState(s => ({ ...s, status: 'ready', error: null }))
    }

    try {
      const data = await fetchTransactions()
      if (!mountedRef.current) return
      cache = { rows: data.rows || [], status: 'ready', error: null, lastUpdated: data.updatedAt || null }
      setState({
        rows: data.rows || [],
        status: 'ready',
        error: null,
        lastUpdated: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      })
    } catch (err) {
      if (!mountedRef.current) return
      const error = getRequestErrorMessage(err)
      cache = { ...cache, status: 'error', error }
      setState(s => ({ ...s, status: 'error', error }))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (enabled && !cache.rows) fetchData()
    return () => { mountedRef.current = false }
  }, [enabled, fetchData])

  const summary = computeSummary(state.rows)
  const categories = useCallback(
    () => [...new Set(state.rows.map(r => r.category))].sort(),
    [state.rows]
  )

  return (
    <TransactionsContext.Provider
      value={{ rows: state.rows, status: state.status, error: state.error, summary, categories: categories(), lastUpdated: state.lastUpdated, refetch: fetchData }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within a TransactionsProvider')
  return ctx
}
