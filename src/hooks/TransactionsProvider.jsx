import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { computeSummary } from '../utils/computations.js'

// Module-level cache shared across all provider instances (and remounts).
let cache = {
  rows: null,
  status: 'idle',
  error: null,
  lastUpdated: null,
}

// In-flight request dedupe — one shared promise per fetch window.
let inFlight = null

async function fetchTransactions() {
  if (inFlight) return inFlight
  inFlight = (async () => {
    const res = await fetch('/api/transactions', { signal: AbortSignal.timeout(12000) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    if (data.error) throw new Error(data.error)
    return data
  })().finally(() => { inFlight = null })
  return inFlight
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
  const controllerRef = useRef(null)

  const fetchData = useCallback(async () => {
    // If we already have fresh-ish data, still refresh in the background.
    setState(s => ({ ...s, status: 'loading' }))

    const controller = new AbortController()
    controllerRef.current = controller

    for (let attempt = 0; attempt < 2; attempt++) {
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
        return
      } catch (err) {
        if (attempt === 1) {
          if (!mountedRef.current) return
          cache = { ...cache, status: 'error', error: err.message }
          setState(s => ({ ...s, status: 'error', error: err.message }))
        }
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (enabled && !cache.rows) fetchData()
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
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
