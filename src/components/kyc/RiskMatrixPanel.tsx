import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { saveClientRiskMatrix } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { canWrite } from '../../lib/permissions'
import type { Client } from '../../lib/types'
import { RISK_LABELS } from '../../lib/types'
import {
  RISK_FACTOR_LABELS,
  calcMatrixScore,
  calcMatrixRiskLevel,
  defaultRiskMatrix,
  type RiskMatrixFactors,
} from '../../lib/risk-matrix'

interface RiskMatrixPanelProps {
  client: Client
  onUpdated: () => void
}

export function RiskMatrixPanel({ client, onUpdated }: RiskMatrixPanelProps) {
  const { user, profile } = useAuth()
  const canEdit = canWrite(profile?.role)
  const stored = (client.risk_matrix ?? {}) as unknown as RiskMatrixFactors
  const [factors, setFactors] = useState<RiskMatrixFactors>(
    Object.keys(stored).length ? stored : defaultRiskMatrix(client.client_type, client.vulnerable_activity ?? false),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const score = calcMatrixScore(factors)
  const level = calcMatrixRiskLevel(factors)

  function setFactor(key: keyof RiskMatrixFactors, value: number) {
    setFactors((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await saveClientRiskMatrix(client.id, { ...factors, notes: factors.notes }, user?.id)
    setSaving(false)
    if (result.error) setError(result.error)
    else {
      setSaved(true)
      onUpdated()
    }
  }

  return (
    <div className="risk-matrix-panel">
      <div className="risk-matrix-header">
        <div>
          <strong>Matriz de riesgo PLD</strong>
          <p className="card-desc">Evaluación por factores (1=bajo, 3=alto). Actualiza el nivel del cliente.</p>
        </div>
        <div className="risk-matrix-score">
          <span className="exec-value">{score}</span>
          <Badge variant={level === 'bajo' ? 'success' : level === 'medio' ? 'warning' : 'danger'}>
            {RISK_LABELS[level]}
          </Badge>
        </div>
      </div>

      <div className="risk-factors-grid">
        {RISK_FACTOR_LABELS.map(({ key, label, hint }) => (
          <div key={key} className="risk-factor-row">
            <div>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
            <Select
              label=""
              value={String(factors[key] ?? 1)}
              onChange={(e) => setFactor(key, Number(e.target.value))}
              disabled={!canEdit}
            >
              <option value="1">1 — Bajo</option>
              <option value="2">2 — Medio</option>
              <option value="3">3 — Alto</option>
            </Select>
          </div>
        ))}
      </div>

      <Input
        label="Notas de evaluación"
        value={factors.notes ?? ''}
        onChange={(e) => setFactors((f) => ({ ...f, notes: e.target.value }))}
        disabled={!canEdit}
      />

      {error && <p className="form-error">{error}</p>}
      {saved && <p className="form-success">Matriz guardada — riesgo {RISK_LABELS[level]}</p>}

      {canEdit ? (
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando...' : 'Guardar matriz de riesgo'}
        </Button>
      ) : (
        <p className="card-desc">Solo abogados y administradores pueden editar la matriz.</p>
      )}
    </div>
  )
}
