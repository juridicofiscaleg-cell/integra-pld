import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { createTrainingSession, updateTrainingSession } from '../../lib/api'
import type { TrainingModality, TrainingSession } from '../../lib/types'
import { TRAINING_MODALITY_LABELS } from '../../lib/types'

interface TrainingFormModalProps {
  open: boolean
  session?: TrainingSession | null
  onClose: () => void
  onSaved: (id?: string) => void
  userId?: string
}

const emptyForm = {
  title: '',
  session_date: new Date().toISOString().slice(0, 10),
  topic: 'Capacitación PLD/FT',
  participants: '',
  duration_hours: '',
  instructor: '',
  location: '',
  modality: 'presencial' as TrainingModality,
  notes: '',
}

export function TrainingFormModal({ open, session, onClose, onSaved, userId }: TrainingFormModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      setForm({
        title: session.title,
        session_date: session.session_date,
        topic: session.topic,
        participants: session.participants ?? '',
        duration_hours: session.duration_hours?.toString() ?? '',
        instructor: session.instructor ?? '',
        location: session.location ?? '',
        modality: (session.modality as TrainingModality) ?? 'presencial',
        notes: session.notes ?? '',
      })
    } else {
      setForm(emptyForm)
    }
    setError('')
  }, [session, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      session_date: form.session_date,
      topic: form.topic.trim(),
      participants: form.participants,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      instructor: form.instructor,
      location: form.location,
      modality: form.modality,
      notes: form.notes,
    }

    if (session) {
      const updateResult = await updateTrainingSession(session.id, payload)
      setSaving(false)
      if (updateResult.error) {
        setError(updateResult.error)
        return
      }
      onSaved(session.id)
    } else {
      const createResult = await createTrainingSession(payload, userId)
      setSaving(false)
      if (createResult.error) {
        setError(createResult.error)
        return
      }
      onSaved(createResult.id)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? 'Editar capacitación' : 'Nueva capacitación PLD/FT'}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Input label="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div className="form-row">
          <Input label="Fecha *" type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} required />
          <Input label="Duración (horas)" type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
        </div>
        <Input label="Tema *" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required />
        <div className="form-row">
          <Input label="Instructor" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          <Select label="Modalidad" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as TrainingModality })}>
            {(Object.keys(TRAINING_MODALITY_LABELS) as TrainingModality[]).map((m) => (
              <option key={m} value={m}>{TRAINING_MODALITY_LABELS[m]}</option>
            ))}
          </Select>
        </div>
        <Input label="Lugar / plataforma" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div className="form-field">
          <label htmlFor="participants">Participantes (uno por línea o separados por coma)</label>
          <textarea
            id="participants"
            className="input textarea"
            rows={4}
            value={form.participants}
            onChange={(e) => setForm({ ...form, participants: e.target.value })}
            placeholder="Lic. Adrián Gerardo&#10;Lic. María Pérez"
          />
        </div>
        <div className="form-field">
          <label htmlFor="notes">Notas / contenido impartido</label>
          <textarea
            id="notes"
            className="input textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Señales de alerta, umbrales, procedimiento de avisos..."
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : session ? 'Guardar cambios' : 'Registrar capacitación'}</Button>
        </div>
      </form>
    </Modal>
  )
}
