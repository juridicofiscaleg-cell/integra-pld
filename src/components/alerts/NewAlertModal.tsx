import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { AssignSelect } from '../ui/AssignSelect'
import { createAlert, notifyAssigneeEmail } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import type { AlertType, Client, Expediente, Profile } from '../../lib/types'

interface NewAlertModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  clients: Client[]
  expedientes: Expediente[]
  profiles: Profile[]
  defaultClientId?: string
  defaultExpedienteId?: string
}

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'general', label: 'Tarea general' },
  { value: 'documento', label: 'Documento pendiente' },
  { value: 'etapa', label: 'Etapa / plazo' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'kyc', label: 'KYC' },
]

export function NewAlertModal({
  open,
  onClose,
  onCreated,
  clients,
  expedientes,
  profiles,
  defaultClientId,
  defaultExpedienteId,
}: NewAlertModalProps) {
  const { user } = useAuth()
  const { runProtectedAction } = useProtectedAction()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('general')
  const [dueDate, setDueDate] = useState('')
  const [clientId, setClientId] = useState(defaultClientId ?? '')
  const [expedienteId, setExpedienteId] = useState(defaultExpedienteId ?? '')
  const [assignedTo, setAssignedTo] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setTitle('')
    setMessage('')
    setDueDate('')
    setClientId(defaultClientId ?? '')
    setExpedienteId(defaultExpedienteId ?? '')
    setAssignedTo('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const alertData = {
      title,
      message,
      alert_type: alertType,
      due_date: dueDate || undefined,
      client_id: clientId || undefined,
      expediente_id: expedienteId || undefined,
      assigned_to: assignedTo || undefined,
    }
    const result = await runProtectedAction({
      actionType: 'create_alert',
      title: `Nueva alerta: ${title.trim()}`,
      clientId: clientId || undefined,
      payload: { alertData },
      direct: async () => {
        const r = await createAlert(alertData, user?.id)
        return r.error ? { error: r.error } : {}
      },
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.pending) {
      alert('Alerta enviada a Autorizaciones.')
      reset()
      onClose()
      return
    }
    if (notifyEmail && assignedTo) {
      const assignee = profiles.find((p) => p.id === assignedTo)
      if (assignee?.email) {
        notifyAssigneeEmail(
          assignee.email,
          `[Integra PLD] ${title}`,
          `${message || title}\n\nRevisa en Integra PLD → Alertas`,
        )
      }
    }
    reset()
    onClose()
    onCreated()
  }

  const filteredExp = clientId
    ? expedientes.filter((e) => e.client_id === clientId)
    : expedientes

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nueva alerta / tarea">
      <form onSubmit={handleSubmit} className="form-stack">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Descripción" value={message} onChange={(e) => setMessage(e.target.value)} />
        <Select label="Tipo" value={alertType} onChange={(e) => setAlertType(e.target.value as AlertType)}>
          {ALERT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <Input label="Fecha límite" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Select label="Cliente (opcional)" value={clientId} onChange={(e) => { setClientId(e.target.value); setExpedienteId('') }}>
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select label="Expediente (opcional)" value={expedienteId} onChange={(e) => setExpedienteId(e.target.value)}>
          <option value="">—</option>
          {filteredExp.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </Select>
        <AssignSelect value={assignedTo} onChange={setAssignedTo} profiles={profiles} />
        <label className="checkbox-row">
          <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
          Notificar por correo al responsable (abre borrador)
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear alerta'}</Button>
        </div>
      </form>
    </Modal>
  )
}
