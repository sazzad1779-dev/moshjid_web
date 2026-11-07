// Shared security helpers for all API handlers.
//
// Fail-safe secret handling: there is intentionally NO hardcoded fallback for
// ADMIN_SECRET. If the environment variable is missing, the server refuses to
// sign/verify tokens instead of silently using a publicly-known default.
//
// CORS: origins must be explicitly allowed. Wildcard "*" is never used because
// it would let any site read credentialed responses.

const FALLBACK_ENV_SECRET = process.env.ADMIN_SECRET || ''

// ── JWT signing secret ─────────────────────────────────────
export function getSecret() {
  if (FALLBACK_ENV_SECRET && FALLBACK_ENV_SECRET.length >= 32) return FALLBACK_ENV_SECRET
  return null
}

// ── Allowed origins ────────────────────────────────────────
const DEFAULT_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

export function isAllowedOrigin(origin) {
  if (!origin) return false
  return DEFAULT_ALLOWED_ORIGINS.includes(origin)
}

export function applyCors(res, req) {
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

// ── Login rate limiting (in-memory) ────────────────────────
// Simple per-IP window limiter for the PIN login endpoint. Enough to slow
// brute-force attempts on short numeric PINs without adding infra.
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5

const loginAttempts = new Map() // ip -> { count, resetAt }

export function rateLimitLogin(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS - 1 }
  }

  entry.count += 1
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS - entry.count }
}

export function resetLoginRateLimit(ip) {
  loginAttempts.delete(ip)
}

// ── Session cookie / token parsing ─────────────────────────
export const COOKIE_NAME = 'mosque_session'

export function readSessionToken(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}
