import React, { useState } from 'react'
import { Check, Clock3, FileText } from 'lucide-react'
import usePrayerTimes, { requestPrayerTimes } from '../../hooks/usePrayerTimes.js'
import { PRAYER_FIELDS } from '../../utils/prayerSchedule.js'
import { PageTitle, PreviewNotice } from './AdminShared.jsx'

const SUGGESTED_TIMES = {
  fajr: '04:45', dhuhr: '13:15', asr: '16:30', maghrib: '18:05', isha: '19:30', jummah: '13:30',
}

function PrayerSettings() {
  const { status, times, error, retry } = usePrayerTimes()
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')

  async function publish(event) {
    event.preventDefault()
    if (saveStatus === 'saving') return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setSaveStatus('saving')
    setSaveError('')
    try {
      await requestPrayerTimes({ times: values, signal: AbortSignal.timeout(12000) })
      setSaveStatus('saved')
    } catch (error) {
      setSaveStatus('error')
      setSaveError(error.message)
    }
  }

  return (
    <section className="admin-panel admin-prayer-settings">
      <div className="admin-panel-heading">
        <div><h2>Prayer times</h2><p>Publish the mosque’s schedule to the homepage in Dhaka time.</p></div>
        <span className="admin-section-icon"><Clock3 size={19} aria-hidden="true" /></span>
      </div>
      {status === 'loading' && <p className="admin-data-status" role="status">Loading prayer times…</p>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert">
        <span>{error}</span><button type="button" className="admin-button admin-button--quiet" onClick={retry}>Retry</button>
      </div>}
      {status === 'ready' && (
        <form onSubmit={publish} onChange={() => { setSaveStatus('idle'); setSaveError('') }}>
          <fieldset className="admin-prayer-grid" disabled={saveStatus === 'saving'}>
            <legend className="sr-only">Prayer schedule</legend>
            {PRAYER_FIELDS.map(({ key, name }) => (
              <label key={key} className="admin-time-field">
                <span>{name}{key === 'jummah' && ' (Friday)'}</span>
                <input type="time" name={key} defaultValue={(times || SUGGESTED_TIMES)[key]} required />
              </label>
            ))}
          </fieldset>
          <p className="admin-help-text">
            {times || saveStatus === 'saved' ? 'Jummah appears in place of Dhuhr on Fridays.' : 'Confirm these suggested times with the mosque before publishing. Jummah appears in place of Dhuhr on Fridays.'}
          </p>
          {saveError && <p className="admin-data-status admin-data-status--error" role="alert">{saveError}</p>}
          <div className="admin-settings-actions">
            {saveStatus === 'saved' && <span className="admin-saved-message" role="status"><Check size={16} aria-hidden="true" />Published to the homepage</span>}
            <button type="submit" className="admin-button admin-button--primary" disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Publishing…' : 'Publish prayer times'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default function AdminSettings({ settings, setSettings }) {
  return (
    <>
      <PageTitle title="Settings" description="Manage the mosque’s prayer schedule and page content." />
      <div className="admin-settings">
        <PrayerSettings />
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h2>Page text &amp; announcements</h2></div>
            <span className="admin-section-icon"><FileText size={19} aria-hidden="true" /></span>
          </div>
          <PreviewNotice>Page text and announcements are a local preview.</PreviewNotice>
          <div className="admin-form admin-page-text">
            <label>Home page welcome text<input value={settings.welcomeText} onChange={event => setSettings({ ...settings, welcomeText: event.target.value })} /></label>
            <label>Announcement<textarea rows={4} value={settings.announcement} onChange={event => setSettings({ ...settings, announcement: event.target.value })} /></label>
          </div>
        </section>
      </div>
    </>
  )
}
