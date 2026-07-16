import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { createClient } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { ClientType, RiskLevel } from '../../lib/types'
import { RISK_LABELS } from '../../lib/types'

interface NewClientModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewClientModal({ open, onClose, onCreated }: NewClientModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [clientType, setClientType] = useState<ClientType>('persona_moral')
  const [rfc, setRfc] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medio')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName('')
    setClientType('persona_moral')
    setRfc('')
    setEmail('')
    setPhone('')
    setIndustry('')
    setRiskLevel('medio')
    setNotes('')
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await createClient(
      {
        name,
        client_type: clientType,
        rfc,
        email,
        phone,
        industry,
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

    reset()
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo cliente">
      <form onSubmit={handleSubmit}>
        <Input
          label="Nombre o razón social *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select label="Tipo de cliente" value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)}>
          <option value="persona_moral">Persona moral</option>
          <option value="persona_fisica">Persona física</option>
        </Select>
        <div className="form-row">
          <Input label="RFC" value={rfc} onChange={(e) => setRfc(e.target.value)} />
          <Input label="Industria / Giro" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div className="form-row">
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Select label="Nivel de riesgo" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}>
          {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
            <option key={level} value={level}>{RISK_LABELS[level]}</option>
          ))}
        </Select>
        <Input label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
