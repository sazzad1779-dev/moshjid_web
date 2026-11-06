import React from 'react'
import { formatTaka } from '../utils/formatters.js'

export default function Hero({ balance, totalIncome, totalExpense }) {
  return (
    <header className="hero">
      <div className="hero__brand">
        <img src="/mosque-logo.svg" alt="Mosque logo" className="hero__logo" />
        <div className="hero__text">
          <div className="hero__eyebrow">Madhya Beparipara Mohammadia Jame Masjid</div>
          <h1 className="hero__title">মধ্য বেপারীপাড়া মোহাম্মদিয়া জামে মসজিদ</h1>
          <p className="hero__tagline">প্রতিটি টাকার হিসাব, আপনার আস্থা</p>
        </div>
      </div>
      <div className="hero__card">
        <div className="hero__card-label">Current Balance</div>
        <div className="hero__card-balance" style={{ color: balance >= 0 ? 'var(--c-income)' : 'var(--c-expense)' }}>
          {formatTaka(balance)}
        </div>
        <div className="hero__card-status">
          <span className={`hero__dot${balance >= 0 ? ' is-positive' : ''}`} />
          {balance >= 0 ? 'Healthy financial standing' : 'Deficit — review needed'}
        </div>
        <div className="hero__card-row">
          <span>Income: <strong style={{ color: 'var(--c-income)' }}>{formatTaka(totalIncome)}</strong></span>
          <span>Expense: <strong style={{ color: 'var(--c-expense)' }}>{formatTaka(totalExpense)}</strong></span>
        </div>
      </div>
    </header>
  )
}
