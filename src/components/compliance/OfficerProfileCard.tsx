import { useState } from 'react'
import { Mail, Pencil, Phone, Shield, User } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { saveComplianceOfficer } from '../../lib/api'
import type { ComplianceOfficer } from '../../lib/types'
import { formatDate } from '../../lib/utils'

interface OfficerProfileCardProps {
  officer: ComplianceOfficer
  savedAt?: string
  onUpdated: (officer: ComplianceOfficer) => void
}

export function OfficerProfileCard({ officer, savedAt, onUpdated }: OfficerProfileCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(officer)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const hasOfficer = Boolean(officer.name?.trim())

  function openEdit() {
    setDraft(officer)
    setError('')
    setSuccess('')
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError('')
    const result = await saveComplianceOfficer(draft)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onUpdated(draft)
    setSuccess('Guardado en configuración del despacho.')
    setEditing(false)
  }

  return (
    <>
      <section className="card compliance-officer-card">
        <div className="compliance-section-head">
          <h2><Shield size={18} /> Oficial de cumplimiento</h2>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            <Pencil size={14} /> {hasOfficer ? 'Editar' : 'Designar'}
          </Button>
        </div>

        {hasOfficer ? (
          <div className="officer-profile">
            <div className="officer-avatar">{officer.name.trim().charAt(0).toUpperCase()}</div>
            <div className="officer-details">
              <strong className="officer-name">{officer.name}</strong>
              <span className="officer-badge">Designado · Art. 52 LFPIORPI</span>
              {officer.email && (
                <p className="officer-meta"><Mail size={14} /> {officer.email}</p>
              )}
              {officer.phone && (
                <p className="officer-meta"><Phone size={14} /> {officer.phone}</p>
              )}
              {officer.rfc && (
                <p className="officer-meta"><User size={14} /> RFC: {officer.rfc}</p>
              )}
              {officer.appointed_at && (
                <p className="officer-meta">Designado el {formatDate(officer.appointed_at)}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state compact">
            <p>No hay oficial designado. Regístralo para cumplir con el Art. 52 LFPIORPI.</p>
            <Button onClick={openEdit}>Designar oficial</Button>
          </div>
        )}

        <p className="card-desc officer-storage-note">
          Los datos se guardan en la configuración del despacho (Supabase → firm_settings) y se usan en constancias y reportes PLD.
        </p>
        {savedAt && <p className="card-desc">Última actualización: {formatDate(savedAt)}</p>}
      </section>

      <Modal open={editing} onClose={() => setEditing(false)} title={hasOfficer ? 'Editar oficial de cumplimiento' : 'Designar oficial de cumplimiento'}>
        <form className="form-stack" onSubmit={handleSave}>
          <Input label="Nombre completo *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <Input label="Correo" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <Input label="Teléfono" value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <Input label="RFC" value={draft.rfc ?? ''} onChange={(e) => setDraft({ ...draft, rfc: e.target.value })} />
          <Input label="Fecha de designación" type="date" value={draft.appointed_at ?? ''} onChange={(e) => setDraft({ ...draft, appointed_at: e.target.value })} />
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar oficial'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
