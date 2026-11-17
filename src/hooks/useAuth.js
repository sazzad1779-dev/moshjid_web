import { useState, useEffect, useCallback } from 'react'
import { dedupeRequest } from '../utils/inFlightRequests.js'
import { getRequestErrorMessage, readJsonResponse } from '../utils/requestErrors.js'

function verifySession() {
  return dedupeRequest('/api/auth:verify', async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify' }),
      credentials: 'include',
      signal: AbortSignal.timeout(12000),
    })
    if (response.status === 401) return { authenticated: false }
    return readJsonResponse(response, 'We couldn’t check your sign-in. Try again in a moment.')
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
      const data = await readJsonResponse(res, 'We couldn’t sign you in. Try again. If the problem continues, contact the site administrator.')
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
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
      credentials: 'include',
      signal: AbortSignal.timeout(12000),
    })
    if (response.status !== 401) {
      await readJsonResponse(response, 'We couldn’t sign you out. Try again.')
    }
    setAuth({ loading: false, authenticated: false, role: null, error: null })
  }, [])

  useEffect(() => { verify() }, [verify])

  return { ...auth, login, logout, verify }
}
