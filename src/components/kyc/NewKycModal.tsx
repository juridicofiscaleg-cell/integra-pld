import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { createKyc } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { Client, Expediente, KycChecklist } from '../../lib/types'
import { KYC_CHECKLIST_ITEMS } from '../../lib/types'

interface NewKycModalProps {
  open: boolean
  onClose: () => void
  clients: Client[]
  expedientes: Expediente[]
  onCreated: () => void
}

const emptyChecklist = (): KycChecklist =>
  Object.fromEntries(KYC_CHECKLIST_ITEMS.map((i) => [i.key, false])) as KycChecklist

export function NewKycModal({ open, onClose, clients, expedientes, onCreated }: NewKycModalProps) {
  const { user } = useAuth()
  const [clientId, setClientId] = useState('')
  const [expedienteId, setExpedienteId] = useState('')
  const [checklist, setChecklist] = useState<KycChecklist>(emptyChecklist())
  const [pep, setPep] = useState(false)
  const [sanctionsCheck, setSanctionsCheck] = useState(false)
  const [beneficialOwner, setBeneficialOwner] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const clientExpedientes = expedientes.filter((e) => e.client_id === clientId)

  function reset() {
    setClientId('')
    setExpedienteId('')
    setChecklist(emptyChecklist())
    setPep(false)
    setSanctionsCheck(false)
    setBeneficialOwner('')
    setReviewNotes('')
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleCheck(key: keyof KycChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      setError('Selecciona un cliente.')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await createKyc(
      {
        client_id: clientId,
        expediente_id: expedienteId || undefined,
        checklist,
        pep,
        sanctions_check: sanctionsCheck,
        beneficial_owner: beneficialOwner,
        review_notes: reviewNotes,
        status: 'en_revision',
      },
      user?.id,
    )

    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }

    reset()
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo KYC / Debida diligencia">
      {clients.length === 0 ? (
        <p className="empty-state">Primero crea un cliente.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <Select label="Cliente *" value={clientId} onChange={(e) => { setClientId(e.target.value); setExpedienteId('') }}>
            <option value="">Seleccionar...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          {clientId && clientExpedientes.length > 0 && (
            <Select label="Expediente (opcional)" value={expedienteId} onChange={(e) => setExpedienteId(e.target.value)}>
              <option value="">Sin vincular</option>
              {clientExpedientes.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </Select>
          )}

          <div className="checklist-form">
            <span className="checklist-header">Documentación recibida</span>
            {KYC_CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!checklist[item.key]}
                  onChange={() => toggleCheck(item.key)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="checkbox-flags">
            <label className="checkbox-row">
              <input type="checkbox" checked={pep} onChange={(e) => setPep(e.target.checked)} />
              Persona Políticamente Expuesta (PEP)
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={sanctionsCheck} onChange={(e) => setSanctionsCheck(e.target.checked)} />
              Listas negras verificadas
            </label>
          </div>

          <Input label="Beneficiario controlador" value={beneficialOwner} onChange={(e) => setBeneficialOwner(e.target.value)} />
          <Input label="Notas de revisión" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />

          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear KYC'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
