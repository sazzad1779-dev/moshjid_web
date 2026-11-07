import React, { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { formatDate } from '../../utils/formatters.js'
import {
  EmptyState, MemberDialog, PageTitle, Pagination, PreviewNotice,
  StatusBadge, PAGE_SIZE,
} from './AdminShared.jsx'

export default function AdminMembers({ members, setMembers }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [dialogMember, setDialogMember] = useState(undefined)
  const [page, setPage] = useState(1)
  const filtered = members.filter(member => {
    const matchesText = `${member.fullName} ${member.phone} ${member.id} ${member.area}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (statusFilter === 'All status' || member.status === statusFilter)
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageMembers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount])

  const save = member => {
    setMembers(current => current.some(item => item.id === member.id)
      ? current.map(item => item.id === member.id ? member : item)
      : [member, ...current])
    setDialogMember(undefined)
  }

  const remove = member => {
    if (window.confirm(`Remove ${member.fullName} from this preview?`)) {
      setMembers(current => current.filter(item => item.id !== member.id))
    }
  }

  return (
    <>
      <PageTitle eyebrow="People" title="Members" description="View and manage member profiles and contact information." action={<button className="admin-button admin-button--primary" onClick={() => setDialogMember(null)}><Plus size={17} />Add member</button>} />
      <PreviewNotice>These sample profiles are for layout preview only. Changes stay in this browser session and are not written to the profile table.</PreviewNotice>
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="admin-search"><Search size={17} /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search name, phone, ID..." /></label>
          <select aria-label="Filter members by status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}><option>All status</option><option>Active</option><option>Inactive</option></select>
          <div className="admin-result-count">{filtered.length} members</div>
        </div>
        {pageMembers.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Member</th><th>Member ID</th><th>Phone</th><th>Area</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{pageMembers.map(member => (
                <tr key={member.id}>
                  <td><div className="admin-member-cell"><span className="admin-avatar">{member.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{member.fullName}</strong></div></td>
                  <td className="admin-mono">{member.id}</td><td>{member.phone || '—'}</td><td>{member.area || '—'}</td><td>{formatDate(member.joinedAt)}</td>
                  <td><StatusBadge status={member.status} /></td>
                  <td><div className="admin-row-actions"><button className="admin-icon-button" aria-label={`Edit ${member.fullName}`} onClick={() => setDialogMember(member)}><Pencil size={16} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label={`Delete ${member.fullName}`} onClick={() => remove(member)}><Trash2 size={16} /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={Users} title="No members found" description="Try changing your search or status filter." />}
        <Pagination page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
      </section>
      {dialogMember !== undefined && <MemberDialog member={dialogMember} onClose={() => setDialogMember(undefined)} onSave={save} />}
    </>
  )
}
