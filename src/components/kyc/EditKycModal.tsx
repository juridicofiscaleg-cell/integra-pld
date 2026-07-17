import { addYears, format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { BeneficialOwnersEditor } from './BeneficialOwnersEditor'
import { PepQuestionnairePanel } from './PepQuestionnairePanel'
import { renewKyc, updateKycExtended } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import { canApproveKyc } from '../../lib/permissions'
import type { BeneficialOwner, KycRecord, KycStatus, PepQuestionnaire } from '../../lib/types'
import { KYC_CHECKLIST_ITEMS, KYC_STATUS_LABELS } from '../../lib/types'

interface EditKycModalProps {
  kyc: KycRecord | null
  onClose: () => void
  onUpdated: () => void
}

export function EditKycModal({ kyc, onClose, onUpdated }: EditKycModalProps) {
  const { user, profile } = useAuth()
  const { runSensitiveAction } = useProtectedAction()
  const [checklist, setChecklist] = useState(kyc?.checklist ?? {})
  const [status, setStatus] = useState<KycStatus>(kyc?.status ?? 'pendiente')
  const [pep, setPep] = useState(kyc?.pep ?? false)
  const [sanctionsCheck, setSanctionsCheck] = useState(kyc?.sanctions_check ?? false)
  const [beneficialOwner, setBeneficialOwner] = useState(kyc?.beneficial_owner ?? '')
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([])
  const [pepQuestionnaire, setPepQuestionnaire] = useState<PepQuestionnaire>({ is_pep: false })
  const [reviewNotes, setReviewNotes] = useState(kyc?.review_notes ?? '')
  const [expiresAt, setExpiresAt] = useState(kyc?.expires_at?.slice(0, 10) ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [pendingMsg, setPendingMsg] = useState('')

  useEffect(() => {
    if (kyc) {
      setChecklist(kyc.checklist)
      setStatus(kyc.status)
      setPep(kyc.pep)
      setSanctionsCheck(kyc.sanctions_check)
      setBeneficialOwner(kyc.beneficial_owner ?? '')
      setBeneficialOwners(kyc.beneficial_owners ?? [])
      setPepQuestionnaire(kyc.pep_questionnaire ?? { is_pep: kyc.pep })
      setReviewNotes(kyc.review_notes ?? '')
      setExpiresAt(kyc.expires_at?.slice(0, 10) ?? format(addYears(new Date(), 1), 'yyyy-MM-dd'))
      setError('')
    }
  }, [kyc])

  if (!kyc) return null

  function toggleCheck(key: keyof typeof checklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kyc) return
    setSubmitting(true)
    setError('')

    const pepFinal = pepQuestionnaire.is_pep || pep
    const kycData = {
      checklist,
      status,
      pep: pepFinal,
      sanctions_check: sanctionsCheck,
      beneficial_owner: beneficialOwner,
      beneficial_owners: beneficialOwners,
      pep_questionnaire: pepQuestionnaire,
      review_notes: reviewNotes,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      sanctions_results: kyc.sanctions_results,
    }

    const needsApproval = status === 'aprobado' && kyc.status !== 'aprobado' && !canApproveKyc(profile?.role)

    if (needsApproval) {
      const result = await runSensitiveAction({
        actionType: 'approve_kyc',
        title: `Aprobar KYC: ${kyc.clients?.name ?? 'Cliente'}`,
        clientId: kyc.client_id,
        description: 'Solicitud de aprobación de debida diligencia',
        payload: { kycId: kyc.id, kycData },
        direct: async () => updateKycExtended(kyc.id, kycData, user?.id),
      })
      setSubmitting(false)
      if (result.error) setError(result.error)
      else if (result.pending) {
        setPendingMsg('Aprobación solicitada al abogado. Mientras tanto el KYC sigue en revisión.')
      } else {
        onUpdated()
        onClose()
      }
      return
    }

    const result = await updateKycExtended(kyc.id, kycData, user?.id)

    setSubmitting(false)
    if (result.error) setError(result.error)
    else {
      onUpdated()
      onClose()
    }
  }

  async function handleRenew() {
    if (!kyc) return
    setRenewing(true)
    const result = await renewKyc(kyc.id, user?.id)
    setRenewing(false)
    if (result.error) setError(result.error)
    else {
      onUpdated()
      onClose()
    }
  }

  return (
    <Modal open={!!kyc} onClose={onClose} title={`Editar KYC — ${kyc.clients?.name}`}>
      <form onSubmit={handleSubmit} className="form-stack">
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as KycStatus)}>
          {(Object.keys(KYC_STATUS_LABELS) as KycStatus[]).map((s) => (
            <option key={s} value={s}>{KYC_STATUS_LABELS[s]}</option>
          ))}
        </Select>

        <div className="checklist-form">
          <span className="checklist-header">Documentación</span>
          {KYC_CHECKLIST_ITEMS.map((item) => (
            <label key={item.key} className="checkbox-row">
              <input type="checkbox" checked={!!checklist[item.key]} onChange={() => toggleCheck(item.key)} />
              {item.label}
            </label>
          ))}
        </div>

        <PepQuestionnairePanel value={pepQuestionnaire} onChange={setPepQuestionnaire} />

        <BeneficialOwnersEditor owners={beneficialOwners} onChange={setBeneficialOwners} />

        <Input label="Beneficiario controlador (texto libre)" value={beneficialOwner} onChange={(e) => setBeneficialOwner(e.target.value)} />
        <Input label="Vencimiento KYC" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        <Input label="Notas de revisión" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />

        <label className="checkbox-row">
          <input type="checkbox" checked={sanctionsCheck} onChange={(e) => setSanctionsCheck(e.target.checked)} />
          Listas negras verificadas
        </label>

        {error && <p className="form-error">{error}</p>}
        {pendingMsg && <p className="form-success">{pendingMsg}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={handleRenew} disabled={renewing}>
            {renewing ? 'Renovando...' : 'Renovar KYC'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar cambios'}</Button>
        </div>
      </form>
    </Modal>
  )
}
