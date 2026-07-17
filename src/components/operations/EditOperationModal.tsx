import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { updatePldOperation } from '../../lib/api'
import type { PldOperation } from '../../lib/types'
import { OPERATION_TYPES } from '../../lib/types'

interface EditOperationModalProps {
  operation: PldOperation | null
  onClose: () => void
  onUpdated: () => void
}

export function EditOperationModal({ operation, onClose, onUpdated }: EditOperationModalProps) {
  const [operationDate, setOperationDate] = useState('')
  const [operationType, setOperationType] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [unusual, setUnusual] = useState(false)
  const [reported, setReported] = useState(false)
  const [reportDate, setReportDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (operation) {
      setOperationDate(operation.operation_date)
      setOperationType(operation.operation_type)
      setAmount(operation.amount?.toString() ?? '')
      setDescription(operation.description ?? '')
      setUnusual(operation.unusual)
      setReported(operation.reported)
      setReportDate(operation.report_date ?? '')
      setError('')
    }
  }, [operation])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!operation) return
    setSaving(true)
    const result = await updatePldOperation(operation.id, {
      operation_date: operationDate,
      operation_type: operationType,
      amount: amount ? Number(amount) : undefined,
      description,
      unusual,
      reported,
      report_date: reported ? (reportDate || new Date().toISOString().slice(0, 10)) : undefined,
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else { onClose(); onUpdated() }
  }

  return (
    <Modal open={!!operation} onClose={onClose} title="Editar operación">
      <form onSubmit={handleSave} className="form-stack">
        <Input label="Fecha" type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} required />
        <Select label="Tipo" value={operationType} onChange={(e) => setOperationType(e.target.value)}>
          {OPERATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="checkbox-row">
          <input type="checkbox" checked={unusual} onChange={(e) => setUnusual(e.target.checked)} />
          Operación inusual
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={reported} onChange={(e) => setReported(e.target.checked)} />
          Reportada ante autoridad
        </label>
        {reported && (
          <Input label="Fecha de reporte" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
