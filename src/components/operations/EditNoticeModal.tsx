import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { AssignSelect } from '../ui/AssignSelect'
import { updateUnusualNotice } from '../../lib/api'
import { useProfiles } from '../../hooks/useData'
import type { NoticeStatus, NoticeType, UnusualNotice } from '../../lib/types'
import { NOTICE_STATUS_LABELS, NOTICE_TYPE_LABELS } from '../../lib/types'

interface EditNoticeModalProps {
  notice: UnusualNotice | null
  onClose: () => void
  onUpdated: () => void
}

export function EditNoticeModal({ notice, onClose, onUpdated }: EditNoticeModalProps) {
  const { profiles } = useProfiles()
  const [noticeType, setNoticeType] = useState<NoticeType>('inusual')
  const [status, setStatus] = useState<NoticeStatus>('borrador')
  const [title, setTitle] = useState('')
  const [narrative, setNarrative] = useState('')
  const [amount, setAmount] = useState('')
  const [detectedAt, setDetectedAt] = useState('')
  const [submittedAt, setSubmittedAt] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (notice) {
      setNoticeType(notice.notice_type)
      setStatus(notice.status)
      setTitle(notice.title)
      setNarrative(notice.narrative ?? '')
      setAmount(notice.amount?.toString() ?? '')
      setDetectedAt(notice.detected_at)
      setSubmittedAt(notice.submitted_at ?? '')
      setAssignedTo(notice.assigned_to ?? '')
      setError('')
    }
  }, [notice])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!notice) return
    setSaving(true)
    const newStatus = status
    const result = await updateUnusualNotice(notice.id, {
      notice_type: noticeType,
      status: newStatus,
      title,
      narrative,
      amount: amount ? Number(amount) : undefined,
      detected_at: detectedAt,
      submitted_at: newStatus === 'presentado' ? (submittedAt || new Date().toISOString().slice(0, 10)) : submittedAt || undefined,
      assigned_to: assignedTo || undefined,
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else { onClose(); onUpdated() }
  }

  return (
    <Modal open={!!notice} onClose={onClose} title="Editar aviso PLD">
      <form onSubmit={handleSave} className="form-stack">
        <Select label="Tipo" value={noticeType} onChange={(e) => setNoticeType(e.target.value as NoticeType)}>
          {Object.entries(NOTICE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as NoticeStatus)}>
          {Object.entries(NOTICE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Narrativa" value={narrative} onChange={(e) => setNarrative(e.target.value)} />
        <Input label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Fecha detección" type="date" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} />
        {status === 'presentado' && (
          <Input label="Fecha presentación" type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} />
        )}
        <AssignSelect value={assignedTo} onChange={setAssignedTo} profiles={profiles} />
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
