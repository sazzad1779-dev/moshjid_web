import { useState, useEffect, useCallback } from 'react'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage } from '../utils/requestErrors.js'

function verifySession() {
  return dedupeRequest('/api/auth:verify', async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify' }),
      credentials: 'include',
      signal: AbortSignal.timeout(12000),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
    return data
  })
}

export function useAuth() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, role: null, error: null })

  const verify = useCallback(async () => {
    try {
      const data = await verifySession()
      if (data.authenticated) {
        setAuth({ loading: false, authenticated: true, role: data.role, error: null })
      } else {
        setAuth({ loading: false, authenticated: false, role: null, error: null })
      }
    } catch (error) {
      setAuth({ loading: false, authenticated: false, role: null, error: getRequestErrorMessage(error) })
    }
  }, [])

  const login = useCallback(async (pin) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin }),
        credentials: 'include',
        signal: AbortSignal.timeout(12000),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.success) {
        setAuth({ loading: false, authenticated: true, role: data.role, error: null })
        return { success: true, role: data.role }
      }
      return { success: false, error: data.error }
    } catch (error) {
      return { success: false, error: getRequestErrorMessage(error) }
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
      credentials: 'include',
      signal: AbortSignal.timeout(12000),
    })
    setAuth({ loading: false, authenticated: false, role: null, error: null })
  }, [])

  useEffect(() => { verify() }, [verify])

  return { ...auth, login, logout, verify }
}
