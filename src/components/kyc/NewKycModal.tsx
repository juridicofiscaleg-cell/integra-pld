import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { createKyc } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import { BeneficialOwnersEditor } from './BeneficialOwnersEditor'
import { PepQuestionnairePanel } from './PepQuestionnairePanel'
import type { BeneficialOwner, Client, Expediente, KycChecklist, PepQuestionnaire } from '../../lib/types'
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
  const { runProtectedAction } = useProtectedAction()
  const [clientId, setClientId] = useState('')
  const [expedienteId, setExpedienteId] = useState('')
  const [checklist, setChecklist] = useState<KycChecklist>(emptyChecklist())
  const [pep, setPep] = useState(false)
  const [sanctionsCheck, setSanctionsCheck] = useState(false)
  const [beneficialOwner, setBeneficialOwner] = useState('')
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([])
  const [pepQuestionnaire, setPepQuestionnaire] = useState<PepQuestionnaire>({ is_pep: false })
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
    setBeneficialOwners([])
    setPepQuestionnaire({ is_pep: false })
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

    const pepFinal = pepQuestionnaire.is_pep || pep
    const kycData = {
      client_id: clientId,
      expediente_id: expedienteId || undefined,
      checklist,
      pep: pepFinal,
      sanctions_check: sanctionsCheck,
      beneficial_owner: beneficialOwner,
      beneficial_owners: beneficialOwners,
      pep_questionnaire: pepQuestionnaire,
      review_notes: reviewNotes,
      status: 'en_revision' as const,
    }

    const result = await runProtectedAction({
      actionType: 'create_kyc',
      title: `Crear KYC — ${clients.find((c) => c.id === clientId)?.name ?? 'Cliente'}`,
      clientId,
      payload: { kycData },
      direct: async () => {
        const r = await createKyc(kycData, user?.id)
        return r.error ? { error: r.error } : {}
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

          <PepQuestionnairePanel value={pepQuestionnaire} onChange={setPepQuestionnaire} />
          <BeneficialOwnersEditor owners={beneficialOwners} onChange={setBeneficialOwners} />

          <Input label="Beneficiario controlador (texto)" value={beneficialOwner} onChange={(e) => setBeneficialOwner(e.target.value)} />
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
