import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { CLIENT_EMAIL_TEMPLATES, fillTemplate, openEmailDraft } from '../../lib/email-templates'
import type { Client } from '../../lib/types'
import { useState } from 'react'

interface ClientEmailTemplatesModalProps {
  open: boolean
  onClose: () => void
  client?: Client
  expedienteTitle?: string
  stageName?: string
}

export function ClientEmailTemplatesModal({
  open,
  onClose,
  client,
  expedienteTitle,
  stageName,
}: ClientEmailTemplatesModalProps) {
  const [templateId, setTemplateId] = useState(CLIENT_EMAIL_TEMPLATES[0].id)
  const tpl = CLIENT_EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? CLIENT_EMAIL_TEMPLATES[0]

  const vars = {
    cliente: client?.name ?? 'Cliente',
    expediente: expedienteTitle ?? '',
    etapa: stageName ?? '',
  }

  const subject = fillTemplate(tpl.subject, vars)
  const body = fillTemplate(tpl.body, vars)

  return (
    <Modal open={open} onClose={onClose} title="Plantillas de correo al cliente">
      <Select label="Plantilla" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {CLIENT_EMAIL_TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </Select>
      <div className="email-preview">
        <strong>Asunto:</strong> {subject}
        <pre>{body}</pre>
      </div>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button
          type="button"
          onClick={() => {
            if (client?.email) openEmailDraft(client.email, subject, body)
            else openEmailDraft('', subject, body)
          }}
        >
          Abrir borrador
        </Button>
      </div>
    </Modal>
  )
}
