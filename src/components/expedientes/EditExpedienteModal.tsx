import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { AssignSelect } from '../ui/AssignSelect'
import { updateExpediente } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import type { Expediente, ExpedienteStatus, Priority, Profile } from '../../lib/types'
import { STATUS_LABELS } from '../../lib/types'

interface EditExpedienteModalProps {
  expediente: Expediente | null
  profiles: Profile[]
  onClose: () => void
  onUpdated: () => void
}

export function EditExpedienteModal({ expediente, profiles, onClose, onUpdated }: EditExpedienteModalProps) {
  const { user } = useAuth()
  const { runProtectedAction } = useProtectedAction()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ExpedienteStatus>('activo')
  const [priority, setPriority] = useState<Priority>('media')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (expediente) {
      setTitle(expediente.title)
      setDescription(expediente.description ?? '')
      setStatus(expediente.status)
      setPriority(expediente.priority)
      setAssignedTo(expediente.assigned_to ?? '')
      setError('')
    }
  }, [expediente])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!expediente) return
    setSaving(true)
    setError('')
    const expedienteData = { title, description, status, priority, assigned_to: assignedTo || undefined }
    const result = await runProtectedAction({
      actionType: 'update_expediente',
      title: `Editar expediente: ${title.trim()}`,
      clientId: expediente.client_id,
      payload: { expedienteId: expediente.id, expedienteData },
      direct: () => updateExpediente(expediente.id, expedienteData, user?.id),
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else if (result.pending) {
      alert('Solicitud enviada. El abogado la revisará en Autorizaciones.')
      onClose()
    } else {
      onClose()
      onUpdated()
    }
  }

  return (
    <Modal open={!!expediente} onClose={onClose} title="Editar expediente">
      <form onSubmit={handleSave} className="form-stack">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as ExpedienteStatus)}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </Select>
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
