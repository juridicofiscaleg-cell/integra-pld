import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { createComplianceOfficer, updateComplianceOfficer } from '../../lib/api'
import type { Client, ClientComplianceOfficer } from '../../lib/types'

interface OfficerFormModalProps {
  open: boolean
  officer?: ClientComplianceOfficer | null
  clients: Client[]
  onClose: () => void
  onSaved: () => void
  userId?: string
}

const empty = {
  client_id: '',
  name: '',
  email: '',
  phone: '',
  rfc: '',
  appointed_at: '',
  ended_at: '',
  is_active: true,
  notes: '',
}

export function OfficerFormModal({ open, officer, clients, onClose, onSaved, userId }: OfficerFormModalProps) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (officer) {
      setForm({
        client_id: officer.client_id,
        name: officer.name,
        email: officer.email ?? '',
        phone: officer.phone ?? '',
        rfc: officer.rfc ?? '',
        appointed_at: officer.appointed_at ?? '',
        ended_at: officer.ended_at ?? '',
        is_active: officer.is_active,
        notes: officer.notes ?? '',
      })
    } else {
      setForm(empty)
    }
    setError('')
  }, [officer, open])

  const vulnerableClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) {
      setError('Selecciona el cliente (sujeto obligado).')
      return
    }
    if (!form.name.trim()) {
      setError('El nombre del oficial es obligatorio.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      client_id: form.client_id,
      name: form.name.trim(),
      email: form.email,
      phone: form.phone,
      rfc: form.rfc,
      appointed_at: form.appointed_at || undefined,
      ended_at: form.ended_at || undefined,
      is_active: form.is_active,
      notes: form.notes,
    }

    const result = officer
      ? await updateComplianceOfficer(officer.id, payload)
      : await createComplianceOfficer(payload, userId)

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={officer ? 'Editar oficial de cumplimiento' : 'Registrar oficial de cumplimiento'}
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <Select
          label="Cliente (sujeto obligado) *"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          required
          disabled={!!officer}
        >
          <option value="">Seleccionar cliente...</option>
          {vulnerableClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        {officer && (
          <p className="card-desc">
            Cliente: <Link to={`/clientes/${officer.client_id}`}>{officer.clients?.name ?? 'Ver ficha'}</Link>
          </p>
        )}
        <Input label="Nombre completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="form-row">
          <Input label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Input label="RFC" value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
        <div className="form-row">
          <Input label="Fecha de designación" type="date" value={form.appointed_at} onChange={(e) => setForm({ ...form, appointed_at: e.target.value })} />
          <Input label="Fin de encargo (si aplica)" type="date" value={form.ended_at} onChange={(e) => setForm({ ...form, ended_at: e.target.value })} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Oficial vigente (activo) para este cliente
        </label>
        <div className="form-field">
          <label htmlFor="officer-notes">Notas</label>
          <textarea
            id="officer-notes"
            className="input textarea"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Acuerdo del consejo, referencia al manual PLD..."
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : officer ? 'Guardar cambios' : 'Registrar oficial'}</Button>
        </div>
      </form>
    </Modal>
  )
}
