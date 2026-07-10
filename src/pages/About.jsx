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
      <div style={{ display: 'grid',  gap: 20  ,padding: 20, background: '#f4f8f1', borderRadius: 12 }}>
        <ChartShell title="Mission">
          <div style={{ color: '#5f6b7a',gap: 12, display: 'grid', lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              Support transparent reporting and better financial planning for charitable and community services.
              Every donation and expense is tracked with accountability.
               </p>
           
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
