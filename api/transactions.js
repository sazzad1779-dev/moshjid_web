import Papa from 'papaparse'
import { parseRows } from '../src/utils/parsers.js'

const CSV_URL = process.env.SHEET_CSV_URL

export default async function handler(req, res) {
  if (!CSV_URL) {
    res.status(500).json({ 
      error: 'SHEET_CSV_URL is not set in environment variables.' 
    })
    return
  }

  try {
    const upstream = await fetch(CSV_URL, { 
      headers: { 'Accept': 'text/csv' } 
    })

    if (!upstream.ok) {
      throw new Error(`Google Sheets returned ${upstream.status}`)
    }

    const csvText = await upstream.text()
    const parsed = Papa.parse(csvText, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    })

    const rows = parseRows(parsed.data)

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ rows, count: rows.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() })
  }
}