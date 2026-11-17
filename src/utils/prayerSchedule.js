export const DAILY_PRAYERS = [
  { key: 'fajr', name: 'Fajr' },
  { key: 'dhuhr', name: 'Dhuhr' },
  { key: 'asr', name: 'Asr' },
  { key: 'maghrib', name: 'Maghrib' },
  { key: 'isha', name: 'Isha' },
]
export const JUMMAH = { key: 'jummah', name: 'Jummah' }
export const PRAYER_FIELDS = [...DAILY_PRAYERS, JUMMAH]
export const PRAYER_TIME_ZONE = 'Asia/Dhaka'

const mosqueClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRAYER_TIME_ZONE, weekday: 'short',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
})

export function isPrayerTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function formatPrayerTime(value) {
  const [hour, minute] = value.split(':')
  const hours = Number(hour)
  return `${hours % 12 || 12}:${minute} ${hours < 12 ? 'AM' : 'PM'}`
}

export function getPrayerSchedule(times, now) {
  const local = Object.fromEntries(mosqueClock.formatToParts(now).map(({ type, value }) => [type, value]))
  const elapsed = Number(local.hour) * 3600 + Number(local.minute) * 60 + Number(local.second)
  const prayers = DAILY_PRAYERS
    .map(prayer => local.weekday === 'Fri' && prayer.key === 'dhuhr' ? JUMMAH : prayer)
    .map(prayer => {
      const time = times[prayer.key]
      const [hour, minute] = time.split(':').map(Number)
      return { ...prayer, time, secondsUntil: hour * 3600 + minute * 60 - elapsed }
    })
    .sort((a, b) => a.secondsUntil - b.secondsUntil)
  const upcoming = prayers.filter(prayer => prayer.secondsUntil >= 0)
  const tomorrow = upcoming.length === 0
  const [fajrHour, fajrMinute] = times.fajr.split(':').map(Number)
  const next = upcoming[0] || {
    ...DAILY_PRAYERS[0], time: times.fajr,
    secondsUntil: 86400 - elapsed + fajrHour * 3600 + fajrMinute * 60,
  }
  return { prayers, upcomingCount: upcoming.length, next, tomorrow, isFriday: local.weekday === 'Fri' }
}
