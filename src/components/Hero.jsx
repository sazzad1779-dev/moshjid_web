import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Wallet } from 'lucide-react'
import { formatTaka } from '../utils/formatters.js'

export default function Hero({ balance, totalIncome, totalExpense }) {
  return (
    <header className="hero">
      <div className="hero__brand">
        <div className="hero__eyebrow">Mosque finance</div>
        <h1 className="hero__title" lang="bn">মধ্য বেপারীপাড়া মোহাম্মদিয়া জামে মসজিদ</h1>
        <p className="hero__tagline" lang="bn">প্রতিটি টাকার হিসাব, আপনার আস্থা। মসজিদের আয়, ব্যয় ও সাম্প্রতিক লেনদেন দেখুন।</p>
        <div className="hero__actions">
          <Link className="hero__link hero__link--primary" to="/dashboard">View dashboard <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className="hero__link" to="/transactions">Browse transactions</Link>
        </div>
      </div>
      <dl className="hero__card">
        <div className="hero__balance">
          <dt><Wallet size={17} aria-hidden="true" /> Current balance</dt>
          <dd style={{ color: balance < 0 ? 'var(--c-expense)' : 'var(--c-ink)' }}>{formatTaka(balance)}</dd>
        </div>
        <div className="hero__card-row">
          <div>
            <dt><ArrowDownLeft size={15} aria-hidden="true" /> Income</dt>
            <dd style={{ color: 'var(--c-income)' }}>{formatTaka(totalIncome)}</dd>
          </div>
          <div>
            <dt><ArrowUpRight size={15} aria-hidden="true" /> Expenses</dt>
            <dd style={{ color: 'var(--c-expense)' }}>{formatTaka(totalExpense)}</dd>
          </div>
        </div>
      </dl>
    </header>
  )
}
