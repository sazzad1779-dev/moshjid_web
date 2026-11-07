import React, { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { formatDate, formatTaka } from '../../utils/formatters.js'
import useAdminResource from '../../hooks/useAdminResource.js'
import useMetadata from '../../hooks/useMetadata.js'
import {
  EmptyState, PageTitle, Pagination, StatusBadge,
} from './AdminShared.jsx'

const EMPTY_MEMBER = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  areaId: '',
  role: 'member',
  status: '',
  monthlyAmount: '',
}

export default function AdminMembers() {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)
  const [mutationStatus, setMutationStatus] = useState('idle')
  const [mutationError, setMutationError] = useState('')
  const { data, status, error, refetch } = useAdminResource('members', { q: query, status: statusFilter, page, pageSize: 10 })
  const { data: metadata, status: metadataStatus, error: metadataError } = useMetadata()
  const members = data?.rows || []
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 10)))
  const memberRoles = (metadata?.userRoles || []).filter(role => role === 'member')
  const userStatuses = metadata?.userStatuses || []
  const selectedStatus = userStatuses.includes(memberForm.status) ? memberForm.status : userStatuses[0] || ''
  const canSaveMember = metadataStatus === 'ready' && memberRoles.length > 0 && userStatuses.length > 0
  const areas = metadata?.areas || []
  const areaOptions = editing && memberForm.areaId && !areas.some(area => area.id === memberForm.areaId)
    ? [...areas, { id: memberForm.areaId, name: editing.area || 'Current area' }]
    : areas

  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount])

  const applySearch = event => {
    event.preventDefault()
    setQuery(queryInput.trim())
    setPage(1)
  }

  const changeStatus = event => {
    setStatusFilter(event.target.value)
    setPage(1)
  }

  const startAdding = () => {
    setEditing(null)
    setMemberForm({ ...EMPTY_MEMBER, status: userStatuses[0] || '' })
    setFormOpen(true)
    setMutationError('')
    setMutationStatus('idle')
  }

  const startEditing = member => {
    setEditing(member)
    setFormOpen(true)
    setMemberForm({
      fullName: member.fullName || '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      areaId: member.areaId || '',
      role: member.role || 'member',
      status: member.status || 'active',
      monthlyAmount: member.monthlyAmount === null ? '' : String(member.monthlyAmount ?? ''),
    })
    setMutationError('')
    setMutationStatus('idle')
  }

  const closeForm = () => {
    if (mutationStatus === 'saving') return
    setFormOpen(false)
    setMutationError('')
  }

  const saveMember = async event => {
    event.preventDefault()
    if (!canSaveMember) return
    setMutationStatus('saving')
    setMutationError('')
    try {
      const response = await fetch('/api/admin-data?resource=members', {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing
          ? { ...memberForm, status: selectedStatus, id: editing.id }
          : { ...memberForm, status: selectedStatus }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      setFormOpen(false)
      setMutationStatus('idle')
      refetch()
    } catch (saveError) {
      setMutationError(saveError.message || 'Failed to save member.')
      setMutationStatus('idle')
    }
  }

  const softDeleteMember = async member => {
    if (!window.confirm(`Remove ${member.fullName} from the active member list? Their profile and history will be retained.`)) return
    setMutationStatus('deleting')
    setMutationError('')
    try {
      const response = await fetch('/api/admin-data?resource=members', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      setMutationStatus('idle')
      refetch()
    } catch (deleteError) {
      setMutationError(deleteError.message || 'Failed to remove member.')
      setMutationStatus('idle')
    }
  }

  const updateForm = (key, value) => setMemberForm(current => ({ ...current, [key]: value }))

  return (
    <>
      <PageTitle
        eyebrow="People"
        title="Members"
        description="Member profiles loaded from the database."
        action={<button type="button" className="admin-button admin-button--primary" onClick={startAdding}><Plus size={16} />Add member</button>}
      />
      {mutationError && !formOpen && <div className="admin-data-status admin-data-status--error" role="alert">{mutationError}</div>}
      {mutationStatus === 'deleting' && <div className="admin-data-status" role="status">Removing member…</div>}
      {status === 'loading' && <div className="admin-data-status" role="status">Loading member profiles…</div>}
      {status === 'error' && <div className="admin-data-status admin-data-status--error" role="alert"><span>Could not load member profiles: {error || 'Unknown error'}</span><button type="button" className="admin-button admin-button--quiet" onClick={refetch}>Retry</button></div>}
      {status === 'ready' && (
        <section className="admin-panel">
          <form className="admin-toolbar" onSubmit={applySearch}>
            <label className="admin-search"><Search size={17} /><input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="Search name, phone, email, or UUID..." /></label>
            <select aria-label="Filter members by status" value={statusFilter} onChange={changeStatus}><option value="all">All statuses</option>{userStatuses.map(value => <option key={value} value={value}>{value}</option>)}</select>
            <button type="submit" className="admin-button admin-button--primary">Search</button>
            <div className="admin-result-count">{data.total} members</div>
          </form>
          {members.length ? (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Member</th><th>UUID</th><th>Phone</th><th>Email</th><th>Area</th><th>Address</th><th>Monthly amount</th><th>Joined</th><th>Status</th><th className="admin-align-right">Actions</th></tr></thead>
                <tbody>{members.map(member => (
                  <tr key={member.id}>
                    <td><div className="admin-member-cell"><span className="admin-avatar">{(member.fullName || '').split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{member.fullName}</strong></div></td>
                    <td className="admin-mono">{member.id}</td>
                    <td>{member.phone || '—'}</td><td>{member.email || '—'}</td><td>{member.area || '—'}</td><td>{member.address || '—'}</td>
                    <td>{member.monthlyAmount === null ? '—' : formatTaka(member.monthlyAmount)}</td>
                    <td>{formatDate(member.joinedAt)}</td><td><StatusBadge status={member.status} /></td>
                    <td><div className="admin-row-actions"><button type="button" className="admin-icon-button" aria-label={`Edit ${member.fullName}`} onClick={() => startEditing(member)} disabled={mutationStatus === 'deleting'}><Pencil size={15} /></button><button type="button" className="admin-icon-button admin-icon-button--danger" aria-label={`Remove ${member.fullName}`} title="Soft delete member" onClick={() => softDeleteMember(member)} disabled={mutationStatus === 'deleting'}><Trash2 size={15} /></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState icon={Users} title="No member profiles found" description="There are no member profiles matching these filters." />}
          <Pagination page={page} pageCount={pageCount} total={data.total} pageSize={data.pageSize} onChange={setPage} />
        </section>
      )}
      {formOpen && (
        <div className="admin-dialog-backdrop">
          <section className="admin-dialog admin-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
            <div className="admin-dialog-header">
              <div><h2 id="member-dialog-title">{editing ? 'Edit member' : 'Add member'}</h2>{editing && <p className="admin-mono">UUID: {editing.id}</p>}</div>
              <button type="button" className="admin-icon-button" aria-label="Close member form" onClick={closeForm} disabled={mutationStatus === 'saving'}><X size={18} /></button>
            </div>
            <form onSubmit={saveMember}>
              <div className="admin-form admin-form--member">
                <label>Full name<input required maxLength={200} autoFocus value={memberForm.fullName} onChange={event => updateForm('fullName', event.target.value)} /></label>
                <label>Role<select required disabled={metadataStatus !== 'ready'} value={memberRoles.includes(memberForm.role) ? memberForm.role : memberRoles[0] || ''} onChange={event => updateForm('role', event.target.value)}>{memberRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
                <label>Phone<input type="tel" maxLength={50} value={memberForm.phone} onChange={event => updateForm('phone', event.target.value)} /></label>
                <label>Email<input type="email" maxLength={254} value={memberForm.email} onChange={event => updateForm('email', event.target.value)} /></label>
                <label>Status<select required disabled={metadataStatus !== 'ready'} value={selectedStatus} onChange={event => updateForm('status', event.target.value)}>{userStatuses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                <label>Monthly amount (optional)<input type="number" min="0" max="9999999999.99" step="0.01" value={memberForm.monthlyAmount} onChange={event => updateForm('monthlyAmount', event.target.value)} /></label>
                <label>Area<select disabled={metadataStatus !== 'ready'} value={memberForm.areaId} onChange={event => updateForm('areaId', event.target.value)}><option value="">— Select area —</option>{areaOptions.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
                <label className="admin-form--member-address">Address<textarea rows={2} maxLength={1000} value={memberForm.address} onChange={event => updateForm('address', event.target.value)} /></label>
                {editing && <label>Joined date<input type="date" readOnly value={editing.joinedAt || ''} /></label>}
              </div>
              {metadataStatus === 'loading' && <div className="admin-data-status" role="status">Loading database options…</div>}
              {metadataStatus === 'error' && <div className="admin-data-status admin-data-status--error" role="alert">Could not load database options: {metadataError}</div>}
              {metadata?.areasError && <div className="admin-data-status admin-data-status--error" role="alert">{metadata.areasError} You can still add an address without assigning an area.</div>}
              {metadataStatus === 'ready' && (!memberRoles.length || !userStatuses.length) && <div className="admin-data-status admin-data-status--error" role="alert">Member role or member statuses are missing from the database options.</div>}
              {mutationError && <div className="admin-data-status admin-data-status--error" role="alert">{mutationError}</div>}
              <div className="admin-dialog-actions">
                <button type="button" className="admin-button admin-button--quiet" onClick={closeForm} disabled={mutationStatus === 'saving'}>Cancel</button>
                <button type="submit" className="admin-button admin-button--primary" disabled={mutationStatus === 'saving' || !canSaveMember}>{mutationStatus === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Add member'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
