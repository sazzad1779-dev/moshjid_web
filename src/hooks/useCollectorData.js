import { useState, useEffect, useCallback } from 'react'

export function useCollectorData({ enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    setStatus('loading')
    try {
      const res = await fetch('/api/collectors', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setData(json)
      setStatus('ready')
      setError(null)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    fetchData().catch(() => {})
    return () => controller.abort()
  }, [enabled, fetchData])

  return { data, status, error, refetch: fetchData }
}
