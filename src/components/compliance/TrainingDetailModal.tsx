import { useState } from 'react'
import { Download, FileText, Pencil, Printer, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { deleteTrainingSession, saveTrainingCertificate } from '../../lib/api'
import { generateCertificateText } from '../../lib/certificates'
import {
  buildCertificateHtml,
  downloadCertificateHtml,
  openCertificatePrint,
  parseParticipants,
} from '../../lib/certificate-template'
import type { ComplianceOfficer, FirmProfile, TrainingSession } from '../../lib/types'
import { TRAINING_MODALITY_LABELS } from '../../lib/types'
import { formatDate, formatRelative } from '../../lib/utils'

interface TrainingDetailModalProps {
  session: TrainingSession | null
  officer: ComplianceOfficer
  firm: FirmProfile
  canDelete: boolean
  onClose: () => void
  onEdit: (session: TrainingSession) => void
  onUpdated: () => void
  onDeleted: () => void
}

export function TrainingDetailModal({
  session,
  officer,
  firm,
  canDelete,
  onClose,
  onEdit,
  onUpdated,
  onDeleted,
}: TrainingDetailModalProps) {
  const [generating, setGenerating] = useState(false)
  const [certError, setCertError] = useState('')
  const [certInfo, setCertInfo] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!session) return null

  const participants = parseParticipants(session.participants)
  const hasCertificate = Boolean(session.certificate_text)

  async function handleGenerate() {
    setGenerating(true)
    setCertError('')
    setCertInfo('')
    const result = await generateCertificateText({ training: session!, officer, firm })
    setGenerating(false)

    if (result.error && result.source === 'template') {
      setCertInfo('IA no disponible — se usó plantilla profesional.')
    } else if (result.source === 'ai') {
      setCertInfo('Constancia redactada con IA y guardada en el historial.')
    } else {
      setCertInfo('Constancia generada con plantilla LFPIORPI.')
    }

    if (result.text) {
      await saveTrainingCertificate(session!.id, result.text)
      setPreviewHtml(result.html ?? buildCertificateHtml({ training: session!, officer, firm }, result.text))
      onUpdated()
    } else if (result.error) {
      setCertError(result.error)
    }
  }

  function showExistingCertificate() {
    const html = buildCertificateHtml(
      { training: session!, officer, firm },
      session!.certificate_text,
    )
    setPreviewHtml(html)
  }

  function handlePrint() {
    const html = previewHtml || buildCertificateHtml(
      { training: session!, officer, firm },
      session!.certificate_text,
    )
    openCertificatePrint(html)
  }

  function handleDownload() {
    const html = previewHtml || buildCertificateHtml(
      { training: session!, officer, firm },
      session!.certificate_text,
    )
    const safeTitle = session!.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    downloadCertificateHtml(html, `constancia-${safeTitle}-${session!.session_date}.html`)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta capacitación del historial?')) return
    setDeleting(true)
    const result = await deleteTrainingSession(session!.id)
    setDeleting(false)
    if (result.error) {
      setCertError(result.error)
      return
    }
    onDeleted()
    onClose()
  }

  return (
    <Modal open={!!session} onClose={onClose} title="Ficha de capacitación">
      <div className="training-detail">
        <div className="training-detail-header">
          <div>
            <h3>{session.title}</h3>
            <p className="card-desc">{session.topic}</p>
          </div>
          <div className="training-detail-actions">
            {session.modality && (
              <Badge variant="info">{TRAINING_MODALITY_LABELS[session.modality as keyof typeof TRAINING_MODALITY_LABELS] ?? session.modality}</Badge>
            )}
            {hasCertificate && <Badge variant="success">Constancia generada</Badge>}
          </div>
        </div>

        <dl className="detail-dl">
          <dt>Fecha</dt><dd>{formatDate(session.session_date)}</dd>
          {session.duration_hours != null && (<><dt>Duración</dt><dd>{session.duration_hours} h</dd></>)}
          {session.instructor && (<><dt>Instructor</dt><dd>{session.instructor}</dd></>)}
          {session.location && (<><dt>Lugar</dt><dd>{session.location}</dd></>)}
          <dt>Registro</dt><dd>{formatRelative(session.created_at)}</dd>
          {session.certificate_generated_at && (
            <><dt>Constancia</dt><dd>{formatDate(session.certificate_generated_at)}</dd></>
          )}
        </dl>

        {participants.length > 0 && (
          <div className="training-participants-block">
            <h4>Participantes ({participants.length})</h4>
            <ul>{participants.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}

        {session.notes && (
          <div className="training-notes-block">
            <h4>Contenido / notas</h4>
            <p>{session.notes}</p>
          </div>
        )}

        <div className="certificate-panel">
          <h4><FileText size={16} /> Constancia de capacitación</h4>
          <p className="card-desc">
            Genera automáticamente la constancia (con IA si está configurada, o plantilla profesional).
          </p>
          <div className="certificate-actions">
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles size={16} /> {generating ? 'Generando...' : hasCertificate ? 'Regenerar constancia' : 'Generar constancia con IA'}
            </Button>
            {(hasCertificate || previewHtml) && (
              <>
                <Button variant="secondary" onClick={showExistingCertificate}><FileText size={16} /> Ver vista previa</Button>
                <Button variant="secondary" onClick={handlePrint}><Printer size={16} /> Imprimir / PDF</Button>
                <Button variant="secondary" onClick={handleDownload}><Download size={16} /> Descargar HTML</Button>
              </>
            )}
          </div>
          {certInfo && <p className="form-success">{certInfo}</p>}
          {certError && <p className="form-error">{certError}</p>}
          {(previewHtml || session.certificate_text) && (
            <div className="certificate-preview-wrap">
              <iframe
                title="Vista previa constancia"
                className="certificate-preview-frame"
                srcDoc={previewHtml || buildCertificateHtml({ training: session, officer, firm }, session.certificate_text)}
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <Button variant="secondary" onClick={() => onEdit(session)}><Pencil size={16} /> Editar</Button>
          {canDelete && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} /> {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
