import { useState } from 'react'
import { Building2, Pencil } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { saveFirmProfile } from '../../lib/api'
import type { FirmProfile } from '../../lib/types'

interface FirmProfileCardProps {
  firm: FirmProfile
  onUpdated: (firm: FirmProfile) => void
}

export function FirmProfileCard({ firm, onUpdated }: FirmProfileCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(firm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) {
      setError('El nombre del despacho es obligatorio.')
      return
    }
    setSaving(true)
    const result = await saveFirmProfile(draft)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onUpdated(draft)
    setEditing(false)
  }

  return (
    <>
      <section className="card firm-profile-card">
        <div className="compliance-section-head">
          <h2><Building2 size={18} /> Datos del despacho</h2>
          <Button variant="secondary" size="sm" onClick={() => { setDraft(firm); setError(''); setEditing(true) }}>
            <Pencil size={14} /> Editar
          </Button>
        </div>
        {firm.name ? (
          <div className="firm-summary">
            <strong>{firm.name}</strong>
            {firm.rfc && <span>RFC: {firm.rfc}</span>}
            {firm.address && <span>{firm.address}</span>}
          </div>
        ) : (
          <p className="empty-state compact">Configura el nombre del despacho para encabezados y constancias.</p>
        )}
        <p className="card-desc">Aparece en constancias de capacitación y documentos PLD.</p>
      </section>

      <Modal open={editing} onClose={() => setEditing(false)} title="Datos del despacho">
        <form className="form-stack" onSubmit={handleSave}>
          <Input label="Nombre o razón social *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <Input label="RFC" value={draft.rfc ?? ''} onChange={(e) => setDraft({ ...draft, rfc: e.target.value })} />
          <Input label="Domicilio fiscal" value={draft.address ?? ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
