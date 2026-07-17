import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface StageNotesModalProps {
  open: boolean
  stageName: string
  onClose: () => void
  onConfirm: (notes: string) => void
  loading?: boolean
}

export function StageNotesModal({ open, stageName, onClose, onConfirm, loading }: StageNotesModalProps) {
  const [notes, setNotes] = useState('')

  function handleClose() {
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Completar: ${stageName}`}>
      <p className="card-desc">Agrega notas sobre lo realizado (opcional pero recomendado para auditoría).</p>
      <Input
        label="Notas de la etapa"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej. Se envió cuestionario al cliente, falta acta..."
      />
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
        <Button type="button" disabled={loading} onClick={() => onConfirm(notes)}>
          {loading ? 'Guardando...' : 'Completar etapa'}
        </Button>
      </div>
    </Modal>
  )
}
