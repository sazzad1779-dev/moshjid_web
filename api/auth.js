import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || 'change-this-in-production-32-chars!')
const ADMIN_PINS = (process.env.ADMIN_PINS || '1234')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)

const COLLECTOR_PINS = (process.env.COLLECTOR_PINS || '5678')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)

const COOKIE_NAME = 'mosque_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function setCookie(res, value, maxAge = COOKIE_MAX_AGE) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`)
}

function clearCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`)
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'POST') {
    const { action, pin } = req.body || {}

    // LOGIN
    if (action === 'login') {
      if (!pin || typeof pin !== 'string') {
        res.status(400).json({ error: 'PIN required' })
        return
      }

      let role = null
      if (ADMIN_PINS.includes(pin)) role = 'admin'
      else if (COLLECTOR_PINS.includes(pin)) role = 'collector'

      if (!role) {
        res.status(401).json({ error: 'Invalid PIN' })
        return
      }

      const token = await new SignJWT({ role, iat: Date.now() })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('8h')
        .sign(SECRET)

      setCookie(res, token)
      res.status(200).json({ success: true, role })
      return
    }

    // LOGOUT
    if (action === 'logout') {
      clearCookie(res)
      res.status(200).json({ success: true })
      return
    }

    // VERIFY (check current session)
    if (action === 'verify') {
      const cookie = req.headers.cookie || ''
      const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
      const token = match ? match[1] : null

      if (!token) {
        res.status(401).json({ error: 'Not authenticated' })
        return
      }

      try {
        const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 })
        res.status(200).json({ authenticated: true, role: payload.role })
      } catch {
        clearCookie(res)
        res.status(401).json({ error: 'Session expired' })
      }
      return
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
