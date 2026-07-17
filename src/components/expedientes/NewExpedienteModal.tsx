import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { AssignSelect } from '../ui/AssignSelect'
import { createExpediente } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import type { Client, MatterType, Priority, Profile } from '../../lib/types'
import { MATTER_TYPE_LABELS } from '../../lib/types'

interface NewExpedienteModalProps {
  open: boolean
  onClose: () => void
  clients: Client[]
  profiles: Profile[]
  onCreated: () => void
}

export function NewExpedienteModal({ open, onClose, clients, profiles, onCreated }: NewExpedienteModalProps) {
  const { user } = useAuth()
  const { runProtectedAction } = useProtectedAction()
  const navigate = useNavigate()
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [matterType, setMatterType] = useState<MatterType>('pld')
  const [priority, setPriority] = useState<Priority>('media')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState(user?.id ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setClientId('')
    setTitle('')
    setMatterType('pld')
    setPriority('media')
    setDescription('')
    setAssignedTo(user?.id ?? '')
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      setError('Selecciona un cliente.')
      return
    }
    if (!title.trim()) {
      setError('El título del expediente es obligatorio.')
      return
    }

    setSubmitting(true)
    setError('')

    const expedienteData = {
      client_id: clientId,
      title,
      matter_type: matterType,
      description,
      priority,
      assigned_to: assignedTo || undefined,
    }

    let createdId: string | undefined
    const result = await runProtectedAction({
      actionType: 'create_expediente',
      title: `Crear expediente: ${title.trim()}`,
      clientId,
      payload: { expedienteData },
      direct: async () => {
        const r = await createExpediente(expedienteData, user?.id)
        if (r.error) return { error: r.error }
        createdId = r.expedienteId
        return {}
      },
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    if (result.pending) {
      alert('Solicitud enviada. El abogado la revisará en Autorizaciones.')
      reset()
      onClose()
      return
    }

    const newId = createdId
    reset()
    onCreated()
    onClose()
    if (newId) navigate(`/expedientes/${newId}`)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo expediente">
      {clients.length === 0 ? (
        <div>
          <p className="empty-state">Primero debes crear al menos un cliente.</p>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={handleClose}>Cerrar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Select label="Cliente *" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Seleccionar cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input label="Título del asunto *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select label="Tipo de asunto" value={matterType} onChange={(e) => setMatterType(e.target.value as MatterType)}>
            {(Object.keys(MATTER_TYPE_LABELS) as MatterType[]).map((type) => (
              <option key={type} value={type}>{MATTER_TYPE_LABELS[type]}</option>
            ))}
          </Select>
          <Select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
          <AssignSelect value={assignedTo} onChange={setAssignedTo} profiles={profiles} />
          <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creando...' : 'Crear expediente'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
