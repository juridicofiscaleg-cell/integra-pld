import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { DiagnosisItemRef, Expediente } from '../../lib/types'
import { defaultDiagnosisChecklist, diagnosisProgress } from '../../lib/diagnosis-checklist'
import { saveExpedienteDiagnosis } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

interface DiagnosisPanelProps {
  expediente: Expediente
  onUpdated: () => void
}

export function DiagnosisPanel({ expediente, onUpdated }: DiagnosisPanelProps) {
  const { user } = useAuth()
  const stored = (expediente.diagnosis_checklist ?? []) as DiagnosisItemRef[]
  const [items, setItems] = useState<DiagnosisItemRef[]>(
    stored.length ? stored : defaultDiagnosisChecklist(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const progress = diagnosisProgress(items as import('../../lib/diagnosis-checklist').DiagnosisItem[])

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, resolved: !i.resolved } : i)))
  }

  function setNotes(id: string, notes: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)))
  }

  async function save() {
    setSaving(true)
    setError('')
    const result = await saveExpedienteDiagnosis(expediente.id, items, user?.id)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onUpdated()
  }

  return (
    <div className="diagnosis-panel">
      <p className="card-desc">Gap analysis LFPIORPI — {progress}% evaluado</p>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      {items.map((item) => (
        <div key={item.id} className="diagnosis-row">
          <label className="checkbox-row">
            <input type="checkbox" checked={!!item.resolved} onChange={() => toggle(item.id)} />
            <strong>{item.area}</strong>
          </label>
          <Input label="" placeholder="Hallazgos / notas" value={item.notes ?? ''} onChange={(e) => setNotes(item.id, e.target.value)} />
        </div>
      ))}
      <Button type="button" disabled={saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar diagnóstico'}</Button>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
