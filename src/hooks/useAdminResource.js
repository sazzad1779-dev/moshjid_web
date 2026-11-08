import { useCallback, useEffect, useMemo, useState } from 'react'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage } from '../utils/requestErrors.js'

const REQUEST_TIMEOUT_MS = 12000

function fetchAdminResource(search) {
  return dedupeRequest(`/api/admin-data?${search}`, async () => {
    const response = await fetch(`/api/admin-data?${search}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
    return data
  })
}

export default function useAdminResource(resource, params = {}) {
  const paramsKey = JSON.stringify(params)
  const search = useMemo(() => {
    const query = new URLSearchParams({ resource })
    Object.entries(JSON.parse(paramsKey)).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) query.set(key, String(value))
    })
    return query.toString()
  }, [resource, paramsKey])
  const [result, setResult] = useState({ data: null, status: 'idle', error: null })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setResult(current => ({ ...current, status: 'loading', error: null }))

    fetchAdminResource(search)
      .then(data => setResult({ data, status: 'ready', error: null }))
      .catch(error => {
        if (active) setResult(current => ({ ...current, status: 'error', error: getRequestErrorMessage(error) }))
      })

    return () => { active = false }
  }, [search, refreshKey])

  const refetch = useCallback(() => setRefreshKey(key => key + 1), [])
  return { ...result, refetch }
}
