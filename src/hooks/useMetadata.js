import { useEffect, useState } from 'react'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage } from '../utils/requestErrors.js'

function fetchMetadata() {
  return dedupeRequest('/api/options', async () => {
    const response = await fetch('/api/options', {
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
    return payload
  })
}

export default function useMetadata() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    fetchMetadata()
      .then(payload => {
        if (active) {
          setData(payload)
          setStatus('ready')
        }
      })
      .catch(fetchError => {
        if (active) {
          setError(getRequestErrorMessage(fetchError))
          setStatus('error')
        }
      })
    return () => { active = false }
  }, [])

  return { data, status, error }
}
