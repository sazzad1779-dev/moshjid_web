import { useState, useEffect, useCallback } from 'react'
import { computeSummary } from '../utils/computations.js'

export function useTransactions() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    setStatus('loading')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/transactions', { signal: AbortSignal.timeout(12000) })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        if (data.error) throw new Error(data.error)

        setRows(data.rows || [])
        setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : new Date())
        setStatus('ready')
        setError(null)
        return
      } catch (err) {
        if (attempt === 1) {
          setError(err.message)
          setStatus('error')
          console.error('Failed to fetch transactions:', err)
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const summary = computeSummary(rows)
  const categories = [...new Set(rows.map(r => r.category))].sort()

  return {
    rows,
    status,
    error,
    summary,
    categories,
    lastUpdated,
    refetch: fetchData
  }
}