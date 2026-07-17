import { Mail } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { buildClientUpdateEmail } from '../../lib/sanctions'
import type { Client, Expediente, ExpedienteStage } from '../../lib/types'

interface ClientUpdateEmailModalProps {
  open: boolean
  onClose: () => void
  client?: Client
  expediente: Expediente
  stages: ExpedienteStage[]
}

export function ClientUpdateEmailModal({
  open,
  onClose,
  client,
  expediente,
  stages,
}: ClientUpdateEmailModalProps) {
  const { subject, body } = buildClientUpdateEmail(
    client?.name ?? 'Cliente',
    expediente,
    stages,
  )

  function handleCopy() {
    navigator.clipboard.writeText(body)
  }

  function handleMailto() {
    const email = client?.email ?? ''
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar avance al cliente">
      <p className="card-desc">
        Borrador generado automáticamente con el progreso del expediente. Ábrelo en tu correo o cópialo.
      </p>
      <div className="email-preview">
        <strong>Asunto:</strong> {subject}
        <pre>{body}</pre>
      </div>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button type="button" variant="secondary" onClick={handleCopy}>Copiar texto</Button>
        <Button type="button" onClick={handleMailto} disabled={!client?.email}>
          <Mail size={16} /> Abrir en correo
        </Button>
      </div>
      {!client?.email && (
        <p className="form-error">El cliente no tiene correo registrado. Copia el texto manualmente.</p>
      )}
    </Modal>
  )
}
