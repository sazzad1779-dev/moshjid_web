import { useState, useEffect, useCallback } from 'react'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage } from '../utils/requestErrors.js'

function fetchCollectors() {
  return dedupeRequest('/api/collectors', async () => {
    const res = await fetch('/api/collectors', {
      credentials: 'include',
      signal: AbortSignal.timeout(12000),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
  })
}

export function useCollectorData({ enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    setStatus('loading')
    try {
      const json = await fetchCollectors()
      setData(json)
      setStatus('ready')
      setError(null)
    } catch (err) {
      setError(getRequestErrorMessage(err))
      setStatus('error')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setStatus('idle')
      return
    }
    fetchData()
  }, [enabled, fetchData])

  return { data, status, error, refetch: fetchData }
}
