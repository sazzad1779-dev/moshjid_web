import { useCallback, useEffect, useMemo, useState } from 'react'

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
    const controller = new AbortController()
    setResult(current => ({ ...current, status: 'loading', error: null }))

    fetch(`/api/admin-data?${search}`, {
      credentials: 'include',
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return data
      })
      .then(data => setResult({ data, status: 'ready', error: null }))
      .catch(error => {
        if (error.name !== 'AbortError') {
          setResult(current => ({ ...current, status: 'error', error: error.message }))
        }
      })

    return () => controller.abort()
  }, [search, refreshKey])

  const refetch = useCallback(() => setRefreshKey(key => key + 1), [])
  return { ...result, refetch }
}
