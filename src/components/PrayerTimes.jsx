import React, { useEffect, useState } from 'react'
import { CalendarDays, Check, Clock3 } from 'lucide-react'
import usePrayerTimes from '../hooks/usePrayerTimes.js'
import { formatPrayerTime, getPrayerSchedule } from '../utils/prayerSchedule.js'
import './PrayerTimes.css'

function formatCountdown(seconds) {
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':')
}

function PrayerSchedule({ times }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const { prayers, upcomingCount, next, tomorrow, isFriday } = getPrayerSchedule(times, now)

  return (
    <>
      <div className="prayer-next">
        <div>
          <span className="prayer-next__label" aria-live="polite">
            Next prayer · {tomorrow ? 'Tomorrow' : 'Today'}
          </span>
          <div className="prayer-next__name">{next.name} <time dateTime={next.time}>{formatPrayerTime(next.time)}</time></div>
        </div>
        <div className="prayer-next__countdown">
          <span className="prayer-next__label">Starts in</span>
          <span className="prayer-next__timer" role="timer" aria-label={`Time until ${next.name}`}>{formatCountdown(next.secondsUntil)}</span>
        </div>
      </div>
      <div className="prayer-times__schedule">
        <div className="prayer-times__schedule-heading">
          <h3>Today’s schedule</h3>
          <span>{upcomingCount} remaining today</span>
        </div>
        <ul className="prayer-times__list">
          {prayers.map(prayer => {
            const passed = prayer.secondsUntil < 0
            const isNext = !tomorrow && prayer.key === next.key
            return (
              <li key={prayer.key} className={`prayer-slot${passed ? ' prayer-slot--passed' : isNext ? ' prayer-slot--next' : ''}`}>
                <div className="prayer-slot__name">{prayer.name}</div>
                <time dateTime={prayer.time}>{formatPrayerTime(prayer.time)}</time>
                <span className="prayer-slot__status">
                  {passed && <Check size={13} aria-hidden="true" />}
                  {passed ? 'Passed' : isNext ? 'Next' : 'Upcoming'}
                </span>
              </li>
            )
          })}
        </ul>
        {!isFriday && <p className="prayer-times__friday">
          <CalendarDays size={16} aria-hidden="true" /> Friday Jummah
          <time dateTime={times.jummah}>{formatPrayerTime(times.jummah)}</time>
        </p>}
      </div>
    </>
  )
}

export default function PrayerTimes() {
  const { status, times, retry } = usePrayerTimes()

  return (
    <section className="chart-shell prayer-times" aria-labelledby="prayer-times-title">
      <header className="prayer-times__header">
        <span className="prayer-times__icon"><Clock3 size={21} aria-hidden="true" /></span>
        <div>
          <h2 className="chart-shell__title" id="prayer-times-title">Prayer times</h2>
          <p className="chart-shell__subtitle">Mosque schedule · Dhaka time</p>
        </div>
      </header>
      {times && <PrayerSchedule times={times} />}
      {status === 'loading' && <p className="prayer-times__message" role="status">Loading prayer times…</p>}
      {status === 'ready' && !times && <p className="prayer-times__message">The mosque has yet to publish its prayer schedule.</p>}
      {status === 'error' && <div className="prayer-times__message" role="status">
        Prayer times are temporarily unavailable. <button type="button" className="text-link" onClick={retry}>Try again</button>
      </div>}
    </section>
  )
}
