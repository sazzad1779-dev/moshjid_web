import { useEffect, useState } from 'react'
import { getRequestErrorMessage, readJsonResponse } from '../utils/requestErrors.js'

export async function requestPrayerTimes({ signal, times } = {}) {
  const response = await fetch('/api/prayer-times', {
    signal,
    ...(times && {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ times }),
    }),
  })
  const data = await readJsonResponse(response, times
    ? 'We couldn’t publish the prayer times. Try again. If the problem continues, contact the site administrator.'
    : 'We couldn’t load the prayer times. Try again in a moment.')
  return data.times
}

export default function usePrayerTimes() {
  const [schedule, setSchedule] = useState({ status: 'loading', times: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])
    requestPrayerTimes({ signal })
      .then(times => setSchedule({ status: 'ready', times }))
      .catch(error => {
        if (!controller.signal.aborted) setSchedule({ status: 'error', error: getRequestErrorMessage(error) })
      })
    return () => controller.abort()
  }, [attempt])

  return {
    ...schedule,
    retry: () => {
      setSchedule({ status: 'loading', times: null })
      setAttempt(current => current + 1)
    },
  }
}
