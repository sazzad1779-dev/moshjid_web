import React, { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, Info, Trash2 } from 'lucide-react'
import { getRequestErrorMessage } from '../../utils/requestErrors.js'

export default function AdminActionDialog({
  title, description, detail, actionLabel, pendingLabel, successTitle, danger = false,
  onConfirm, onClose,
}) {
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const done = result !== null
  const Icon = done ? CheckCircle2 : danger ? Trash2 : Info

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    closeButton.current.focus()
    return () => element.close()
  }, [])

  useEffect(() => {
    if (done) closeButton.current.focus()
  }, [done])

  async function confirm(event) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      setResult(await onConfirm())
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError))
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="admin-dialog admin-action-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <span className={`admin-action-dialog__icon${done ? ' is-success' : danger ? ' is-danger' : ''}`}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <h2 id={titleId}>{done ? successTitle : title}</h2>
      <p id={descriptionId}>{done ? result : description}</p>
      {!done && detail && <div className="admin-action-dialog__detail">{detail}</div>}
      {error && <p className="admin-data-status admin-data-status--error" role="alert">{error}</p>}
      <form className="admin-dialog-actions" onSubmit={confirm}>
        <button
          ref={closeButton}
          type="button"
          className={`admin-button admin-button--${done ? 'primary' : 'quiet'}`}
          disabled={pending}
          onClick={onClose}
        >
          {done ? 'Done' : 'Cancel'}
        </button>
        {!done && (
          <button
            type="submit"
            className={`admin-button admin-button--${danger ? 'danger' : 'primary'}`}
            disabled={pending}
          >
            {pending ? pendingLabel : actionLabel}
          </button>
        )}
      </form>
      {pending && <span className="sr-only" role="status">{pendingLabel}</span>}
    </dialog>
  )
}
