import { useEffect, useState } from 'react'

export default function useMetadata() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    fetch('/api/options', { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
        return payload
      })
      .then(payload => {
        if (active) {
          setData(payload)
          setStatus('ready')
        }
      })
      .catch(fetchError => {
        if (active) {
          setError(fetchError.message || 'Failed to load database options.')
          setStatus('error')
        }
      })
    return () => { active = false }
  }, [])

  return { data, status, error }
}
