import { jwtVerify } from 'jose'
import { google } from 'googleapis'

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || 'change-this-in-production-32-chars!')
const COOKIE_NAME = 'mosque_session'
const SHEET_ID = process.env.SHEET_ID || '1oege-UMw2wNS4_GeROiU5yFm_DLcRe2_zCfmJJRMaFM'
const API_KEY = process.env.GOOGLE_API_KEY
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1'

async function verifyAuth(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const token = match ? match[1] : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 })
    return payload
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const session = await verifyAuth(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (!['admin', 'collector'].includes(session.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!API_KEY) {
    res.status(500).json({ error: 'GOOGLE_API_KEY not set' })
    return
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: API_KEY })

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    })

    const rows = result.data.values
    if (!rows || rows.length < 2) {
      res.status(200).json({ collectors: [], totalRows: 0, updatedAt: new Date().toISOString() })
      return
    }

    const headers = rows[0].map(h => String(h).trim())
    const data = rows.slice(1).map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : '' })
      return obj
    })

    const { parseRows } = await import('../src/utils/parsers.js')
    const parsed = parseRows(data)

    // Build collector summary from "Entered By" column
    const byCollector = {}
    parsed.forEach(r => {
      const collector = r.enteredBy || r.entered_by || r['entered by'] || r['এন্ট্রি দিয়েছেন'] || r['ক্যাশ গ্রহণকারী'] || 'Unknown'
      if (!byCollector[collector]) {
        byCollector[collector] = { name: collector, income: 0, expense: 0, count: 0, transactions: [] }
      }
      byCollector[collector][r.type] += r.amount
      byCollector[collector].count += 1
      byCollector[collector].transactions.push(r)
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      collectors: Object.values(byCollector),
      totalRows: parsed.length,
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Collector API Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
