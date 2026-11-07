import React, { useState } from 'react'
import { Check, Clock3, FileText } from 'lucide-react'
import { PageTitle, PreviewNotice } from './AdminShared.jsx'

export default function AdminSettings({ settings, setSettings }) {
  const [saved, setSaved] = useState(false)
  const update = (key, value) => {
    setSettings(current => ({ ...current, [key]: value }))
    setSaved(false)
  }
  const save = event => {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <>
      <PageTitle eyebrow="Website content" title="Settings" description="Manage the prayer schedule and public-facing messages." />
      <PreviewNotice>Settings are currently a design preview and are not published to the public site.</PreviewNotice>
      <form className="admin-settings" onSubmit={save}>
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Prayer times</h2><p>These times are intended for the upcoming prayer schedule on the home page.</p></div><span className="admin-section-icon"><Clock3 size={19} /></span></div>
          <div className="admin-prayer-grid">{[['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']].map(([key, label]) => <label key={key} className="admin-time-field"><span>{label}</span><input type="time" value={settings[key]} onChange={event => update(key, event.target.value)} /></label>)}</div>
          <p className="admin-help-text">Times are shown in local mosque time. Update them when the seasonal schedule changes.</p>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Page text &amp; announcements</h2><p>Update the welcome text and a short public announcement.</p></div><span className="admin-section-icon"><FileText size={19} /></span></div>
          <div className="admin-form">
            <label>Home page welcome text<input value={settings.welcomeText} onChange={event => update('welcomeText', event.target.value)} placeholder="Welcome text for the home page" /></label>
            <label>Announcement<textarea rows={4} value={settings.announcement} onChange={event => update('announcement', event.target.value)} placeholder="Write an announcement for the community" /></label>
          </div>
        </section>
        <div className="admin-settings-actions">{saved && <span className="admin-saved-message"><Check size={16} />Saved in this preview</span>}<button type="submit" className="admin-button admin-button--primary"><Check size={17} />Save changes</button></div>
      </form>
    </>
  )
}
