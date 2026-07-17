import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { createTrainingSession, updateTrainingSession, uploadTrainingEvidence } from '../../lib/api'
import type { Client, ClientComplianceOfficer, TrainingModality, TrainingSession } from '../../lib/types'
import { TRAINING_MODALITY_LABELS } from '../../lib/types'

interface TrainingFormModalProps {
  open: boolean
  session?: TrainingSession | null
  clients: Client[]
  officers: ClientComplianceOfficer[]
  initialClientId?: string
  onClose: () => void
  onSaved: (id?: string) => void
  userId?: string
}

const emptyForm = {
  client_id: '',
  officer_id: '',
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

export function TrainingFormModal({ open, session, clients, officers, initialClientId, onClose, onSaved, userId }: TrainingFormModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

  const clientOfficers = useMemo(
    () => officers.filter((o) => o.client_id === form.client_id),
    [officers, form.client_id],
  )

  useEffect(() => {
    if (session) {
      setForm({
        client_id: session.client_id ?? '',
        officer_id: session.officer_id ?? '',
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
      setForm(initialClientId ? { ...emptyForm, client_id: initialClientId } : emptyForm)
    }
    setEvidenceFile(null)
    setError('')
  }, [session, open, initialClientId])

  useEffect(() => {
    if (!form.client_id) return
    if (form.officer_id && clientOfficers.some((o) => o.id === form.officer_id)) return
    const active = clientOfficers.find((o) => o.is_active)
    if (active) setForm((f) => ({ ...f, officer_id: active.id }))
  }, [form.client_id, clientOfficers, form.officer_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) {
      setError('Selecciona el cliente al que corresponde la capacitación.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      client_id: form.client_id,
      officer_id: form.officer_id || undefined,
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
      if (updateResult.error) {
        setSaving(false)
        setError(updateResult.error)
        return
      }
      if (evidenceFile) {
        const evResult = await uploadTrainingEvidence(session.id, evidenceFile)
        if (evResult.error) {
          setSaving(false)
          setError(evResult.error)
          return
        }
      }
      setSaving(false)
      onSaved(session.id)
    } else {
      const createResult = await createTrainingSession(payload, userId)
      if (createResult.error) {
        setSaving(false)
        setError(createResult.error)
        return
      }
      if (createResult.id && evidenceFile) {
        const evResult = await uploadTrainingEvidence(createResult.id, evidenceFile)
        if (evResult.error) {
          setSaving(false)
          setError(evResult.error)
          return
        }
      }
      setSaving(false)
      onSaved(createResult.id)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? 'Editar capacitación' : 'Nueva capacitación PLD/FT'}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Select
          label="Cliente (sujeto obligado) *"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value, officer_id: '' })}
          required
        >
          <option value="">Seleccionar cliente...</option>
          {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select
          label="Oficial de cumplimiento"
          value={form.officer_id}
          onChange={(e) => setForm({ ...form, officer_id: e.target.value })}
          disabled={!form.client_id}
        >
          <option value="">Sin oficial / seleccionar...</option>
          {clientOfficers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}{o.is_active ? '' : ' (histórico)'}
            </option>
          ))}
        </Select>
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
            placeholder="Nombre completo de cada asistente"
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
        <div className="form-field">
          <label htmlFor="evidence">Evidencia (lista de asistencia, fotos, etc.)</label>
          <input
            id="evidence"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
          />
          {session?.evidence_path && !evidenceFile && (
            <p className="card-desc">Ya hay evidencia registrada. Sube un archivo para reemplazarla.</p>
          )}
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
