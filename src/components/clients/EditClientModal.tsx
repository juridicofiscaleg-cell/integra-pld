import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { updateClient } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { Client, ClientType, RiskLevel } from '../../lib/types'
import { RISK_LABELS, VULNERABLE_ACTIVITIES } from '../../lib/types'

interface EditClientModalProps {
  client: Client | null
  onClose: () => void
  onUpdated: () => void
}

export function EditClientModal({ client, onClose, onUpdated }: EditClientModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(client?.name ?? '')
  const [clientType, setClientType] = useState<ClientType>(client?.client_type ?? 'persona_moral')
  const [rfc, setRfc] = useState(client?.rfc ?? '')
  const [curp, setCurp] = useState(client?.curp ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [industry, setIndustry] = useState(client?.industry ?? '')
  const [activityCode, setActivityCode] = useState(client?.activity_code ?? '')
  const [nationality, setNationality] = useState(client?.nationality ?? 'México')
  const [legalRep, setLegalRep] = useState(client?.legal_representative ?? '')
  const [vulnerableActivity, setVulnerableActivity] = useState(client?.vulnerable_activity ?? false)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(client?.risk_level ?? 'medio')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!client) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await updateClient(
      client!.id,
      {
        name,
        client_type: clientType,
        rfc,
        curp,
        email,
        phone,
        address,
        industry,
        activity_code: activityCode,
        nationality,
        legal_representative: legalRep,
        vulnerable_activity: vulnerableActivity,
        risk_level: riskLevel,
        notes,
      },
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
    <Modal open={!!client} onClose={onClose} title="Editar cliente">
      <form onSubmit={handleSubmit}>
        <Input label="Nombre o razón social *" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select label="Tipo" value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)}>
          <option value="persona_moral">Persona moral</option>
          <option value="persona_fisica">Persona física</option>
        </Select>
        <div className="form-row">
          <Input label="RFC" value={rfc} onChange={(e) => setRfc(e.target.value)} />
          {clientType === 'persona_fisica' && (
            <Input label="CURP" value={curp} onChange={(e) => setCurp(e.target.value)} />
          )}
        </div>
        <div className="form-row">
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Select label="Giro / Actividad" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Seleccionar...</option>
          {VULNERABLE_ACTIVITIES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Input label="Código de actividad" value={activityCode} onChange={(e) => setActivityCode(e.target.value)} placeholder="Ej. 522110" />
        <div className="form-row">
          <Input label="Nacionalidad" value={nationality} onChange={(e) => setNationality(e.target.value)} />
          {clientType === 'persona_moral' && (
            <Input label="Representante legal" value={legalRep} onChange={(e) => setLegalRep(e.target.value)} />
          )}
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={vulnerableActivity} onChange={(e) => setVulnerableActivity(e.target.checked)} />
          Actividad vulnerable (LFPIORPI)
        </label>
        <Select label="Nivel de riesgo" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}>
          {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
            <option key={level} value={level}>{RISK_LABELS[level]}</option>
          ))}
        </Select>
        <Input label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
