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
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        <ChartShell title="About the Mosque Finance System">
          <div style={{ color: '#5f6b7a', lineHeight: 1.8 }}>
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

        <div style={{ display: 'grid', gap: 16 }}>
          <ChartShell title="Mission">
            <p style={{ color: '#5f6b7a', lineHeight: 1.7, margin: 0 }}>
              Support transparent reporting and better financial planning for charitable and community services.
              Every donation and expense is tracked with accountability.
            </p>
          </ChartShell>
          <ChartShell title="Technology Stack">
            <div style={{ display: 'grid', gap: 10 }}>
              {TECH.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#5f6b7a', fontSize: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.palette[i % COLORS.palette.length] }} />
                  {t}
                </div>
              ))}
            </div>
          </ChartShell>
        </div>
      </div>

      <ChartShell title="System Architecture">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, textAlign: 'center' }}>
          {ARCH.map((s, i) => (
            <div key={i} style={{ padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #eef2f5', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, color: '#1d4f2f', marginBottom: 6, fontSize: 15 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#8898aa' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </ChartShell>
    </div>
  )
}
