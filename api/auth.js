import { SignJWT, jwtVerify } from 'jose'
import {
  getSecret,
  applyCors,
  readSessionToken,
  rateLimitLogin,
  resetLoginRateLimit,
  COOKIE_NAME,
} from './_security.js'

const ADMIN_PINS = (process.env.ADMIN_PINS || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)

const COLLECTOR_PINS = (process.env.COLLECTOR_PINS || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)

// Optional PIN → collector display-name mapping. When a collector PIN is used,
// their name is embedded in the session JWT so the API can scope data to that
// person (a collector must never see other collectors' figures).
// Format: comma-separated "PIN:Name" pairs, e.g. "5678:Karim,9012:Rahim".
const COLLECTOR_PIN_NAMES = (process.env.COLLECTOR_PIN_NAMES || '')
  .split(',')
  .map(pair => pair.trim())
  .filter(Boolean)
  .reduce((map, pair) => {
    const [pin, ...rest] = pair.split(':')
    if (pin && rest.length) map[pin.trim()] = rest.join(':').trim()
    return map
  }, {})

const COLLECTOR_DEFAULT_NAME = process.env.COLLECTOR_DEFAULT_NAME || 'Collector'

const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function setCookie(res, value, maxAge = COOKIE_MAX_AGE) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${maxAge}`)
}

function clearCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`)
}

export default async function handler(req, res) {
  applyCors(res, req)

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Fail-safe: never fall back to a known default secret.
  const secret = getSecret()
  if (!secret) {
    res.status(500).json({ error: 'Server is not configured: ADMIN_SECRET is missing.' })
    return
  }

  const { action, pin } = req.body || {}

  // LOGIN
  if (action === 'login') {
    if (!pin || typeof pin !== 'string') {
      res.status(400).json({ error: 'PIN required' })
      return
    }

    // Brute-force protection: limit attempts per IP.
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
    const limit = rateLimitLogin(ip)
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec))
      res.status(429).json({ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` })
      return
    }

    let role = null
    if (ADMIN_PINS.includes(pin)) role = 'admin'
    else if (COLLECTOR_PINS.includes(pin)) role = 'collector'

    if (!role) {
      res.status(401).json({ error: 'Invalid PIN' })
      return
    }

    const token = await new SignJWT({
      role,
      iat: Date.now(),
      ...(role === 'collector' ? { name: COLLECTOR_PIN_NAMES[pin] || COLLECTOR_DEFAULT_NAME } : {})
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode(secret))

    resetLoginRateLimit(ip)
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
    const token = readSessionToken(req)
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { clockTolerance: 60 })
      res.status(200).json({ authenticated: true, role: payload.role })
    } catch {
      clearCookie(res)
      res.status(401).json({ error: 'Session expired' })
    }
    return
  }

  res.status(400).json({ error: 'Unknown action' })
}
