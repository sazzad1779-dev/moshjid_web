import React from 'react'
import ChartShell from '../components/ChartShell.jsx'
import { COLORS } from '../constants.js'

const TECH = ['React 18 + Vite', 'Recharts for Visualization', 'PapaParse for CSV', 'Vercel Serverless API', 'Google Sheets as Database']
const ARCH = [
  { title: 'Google Sheets', desc: 'Source of Truth', icon: '📊' },
  { title: 'Vercel API', desc: 'Serverless Fetch', icon: '⚡' },
  { title: 'React Frontend', desc: 'Interactive UI', icon: '⚛️' },
  { title: 'Public Access', desc: 'Community View', icon: '🌐' },
]

export default function About() {
  return (
    <div style={{ display: 'grid'}}>
      <div style={{ display: 'grid',  gap: 20  }}>
        <ChartShell title="About the Mosque Finance System">
          <div style={{ color: '#5f6b7a',gap: 12, display: 'grid', lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              This platform helps mosque administrators present finances in a clean, trustworthy, and modern way.
              It combines live transaction data with elegant charts and clear summaries.
            </p>
            <h3 style={{ color: '#1d4f2f', marginTop: 24, marginBottom: 12 }}>Key Features</h3>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}><strong>Real-time Sync:</strong> Connects directly to Google Sheets for live data updates</li>
              <li style={{ marginBottom: 8 }}><strong>Multi-tab Navigation:</strong> Home, Dashboard, Monthly, Transactions, About</li>
              <li style={{ marginBottom: 8 }}><strong>Advanced Filtering:</strong> Search, date range, category, and type filters</li>
              <li style={{ marginBottom: 8 }}><strong>Visual Analytics:</strong> Pie charts, bar charts, trend lines, radar charts</li>
              <li style={{ marginBottom: 8 }}><strong>Bengali Support:</strong> Column headers and categories support Bengali text</li>
              <li style={{ marginBottom: 8 }}><strong>Responsive Design:</strong> Works on mobile, tablet, and desktop</li>
            </ul>
          </div>
        </ChartShell>
      </div>



      <ChartShell title="">
        <div style={{ display: 'grid', gap: 12, color: '#5f6b7a', lineHeight: 1.7 }}>
          <p style={{ margin: 0 , fontWeight: 600, color: '#1d4f2f' ,textAlign: 'center'}}>
            For questions, updates, or support, please reach out to the mosque administration office.
          </p>
          <div style={{ display: 'grid', gap: 6 , fontSize: 14, textAlign: 'center', color: '#1d4f2f' }}>
            <div><strong>Email:</strong> sazzad1779@gmail.com</div>
            <div><strong>Phone:</strong> +880 1609-690455</div>
          </div>
        </div>
      </ChartShell>

    </div>
  )
}
