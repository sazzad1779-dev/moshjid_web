import { useState, useEffect, useCallback } from 'react'

export function useAuth() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, role: null })

  const verify = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
        credentials: 'include'
      })
      const data = await res.json()
      if (data.authenticated) {
        setAuth({ loading: false, authenticated: true, role: data.role })
      } else {
        setAuth({ loading: false, authenticated: false, role: null })
      }
    } catch {
      setAuth({ loading: false, authenticated: false, role: null })
    }
  }, [])

  const login = useCallback(async (pin) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', pin }),
      credentials: 'include'
    })
    const data = await res.json()
    if (data.success) {
      setAuth({ loading: false, authenticated: true, role: data.role })
      return { success: true, role: data.role }
    }
    return { success: false, error: data.error }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
      credentials: 'include'
    })
    setAuth({ loading: false, authenticated: false, role: null })
  }, [])

  useEffect(() => { verify() }, [verify])

  return { ...auth, login, logout, verify }
}
