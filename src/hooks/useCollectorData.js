import { useState, useEffect, useCallback } from 'react'

export function useCollectorData() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
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
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, status, error, refetch: fetchData }
}
