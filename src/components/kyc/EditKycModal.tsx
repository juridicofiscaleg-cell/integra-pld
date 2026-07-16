import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { updateKyc } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { KycRecord, KycStatus } from '../../lib/types'
import { KYC_CHECKLIST_ITEMS, KYC_STATUS_LABELS } from '../../lib/types'

interface EditKycModalProps {
  kyc: KycRecord | null
  onClose: () => void
  onUpdated: () => void
}

export function EditKycModal({ kyc, onClose, onUpdated }: EditKycModalProps) {
  const { user } = useAuth()
  const [checklist, setChecklist] = useState(kyc?.checklist ?? {})
  const [status, setStatus] = useState<KycStatus>(kyc?.status ?? 'pendiente')
  const [pep, setPep] = useState(kyc?.pep ?? false)
  const [sanctionsCheck, setSanctionsCheck] = useState(kyc?.sanctions_check ?? false)
  const [beneficialOwner, setBeneficialOwner] = useState(kyc?.beneficial_owner ?? '')
  const [reviewNotes, setReviewNotes] = useState(kyc?.review_notes ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (kyc) {
      setChecklist(kyc.checklist)
      setStatus(kyc.status)
      setPep(kyc.pep)
      setSanctionsCheck(kyc.sanctions_check)
      setBeneficialOwner(kyc.beneficial_owner ?? '')
      setReviewNotes(kyc.review_notes ?? '')
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

    const result = await updateKyc(
      kyc.id,
      { checklist, status, pep, sanctions_check: sanctionsCheck, beneficial_owner: beneficialOwner, review_notes: reviewNotes },
      user?.id,
    )

    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }

    onUpdated()
    onClose()
  }

  return (
    <Modal open={!!kyc} onClose={onClose} title={`Editar KYC — ${kyc.clients?.name}`}>
      <form onSubmit={handleSubmit}>
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as KycStatus)}>
          {(Object.keys(KYC_STATUS_LABELS) as KycStatus[]).map((s) => (
            <option key={s} value={s}>{KYC_STATUS_LABELS[s]}</option>
          ))}
        </Select>

        <div className="checklist-form">
          <span className="checklist-header">Documentación</span>
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
            PEP
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={sanctionsCheck} onChange={(e) => setSanctionsCheck(e.target.checked)} />
            Listas negras verificadas
          </label>
        </div>

        <Input label="Beneficiario controlador" value={beneficialOwner} onChange={(e) => setBeneficialOwner(e.target.value)} />
        <Input label="Notas" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
