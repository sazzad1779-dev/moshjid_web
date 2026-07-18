import Papa from 'papaparse'
import { parseRows } from '../src/utils/parsers.js'

const CSV_URL = process.env.SHEET_CSV_URL
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SHEET_ID = process.env.SHEET_ID
const SHEET_RANGE = process.env.SHEET_RANGE || 'transactions'

function normalizeRange(range) {
  if (!range) return 'transactions!A:Z'
  return range.includes('!') ? range : `${range}!A:Z`
}

function toObjectRows(values) {
  if (!values?.length) return []

  const [headerRow, ...dataRows] = values
  const headers = (headerRow || []).map((header) => String(header || '').trim())

  return dataRows
    .filter((row) => (row || []).some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const record = {}
      headers.forEach((header, index) => {
        record[header || `column_${index + 1}`] = row[index] ?? ''
      })
      return record
    })
}

export default async function handler(req, res) {
  if (!CSV_URL && (!GOOGLE_API_KEY || !SHEET_ID)) {
    res.status(500).json({
      error: 'Either SHEET_CSV_URL or GOOGLE_API_KEY + SHEET_ID must be set in environment variables.'
    })
    return
  }

  try {
    let rows = []

    if (GOOGLE_API_KEY && SHEET_ID) {
      const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(normalizeRange(SHEET_RANGE))}?key=${GOOGLE_API_KEY}`
      const upstream = await fetch(sheetUrl, { signal: AbortSignal.timeout(8000) })

      if (!upstream.ok) {
        throw new Error(`Google Sheets API returned ${upstream.status}`)
      }

      const data = await upstream.json()
      rows = parseRows(toObjectRows(data.values || []))
    } else {
      const upstream = await fetch(CSV_URL, {
        headers: { Accept: 'text/csv' },
        signal: AbortSignal.timeout(8000)
      })

      if (!upstream.ok) {
        throw new Error(`Google Sheets returned ${upstream.status}`)
      }

      const csvText = await upstream.text()
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
      })

      rows = parseRows(parsed.data)
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ rows, count: rows.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() })
  }
}