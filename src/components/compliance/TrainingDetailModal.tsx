import { useState } from 'react'
import { Download, FileText, Pencil, Printer, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { deleteTrainingSession, getTrainingEvidenceUrl, saveTrainingCertificate } from '../../lib/api'
import { generateCertificateText } from '../../lib/certificates'
import { resolveCertificateContext } from '../../lib/compliance-officers'
import {
  buildCertificateHtml,
  buildSingleParticipantCertificateHtml,
  downloadCertificateHtml,
  openCertificatePrint,
  parseCertificateData,
  parseParticipants,
} from '../../lib/certificate-template'
import type { Client, ClientComplianceOfficer, TrainingSession } from '../../lib/types'
import { TRAINING_MODALITY_LABELS } from '../../lib/types'
import { formatDate, formatRelative } from '../../lib/utils'

interface TrainingDetailModalProps {
  session: TrainingSession | null
  clients: Client[]
  officers: ClientComplianceOfficer[]
  canDelete: boolean
  onClose: () => void
  onEdit: (session: TrainingSession) => void
  onUpdated: () => void
  onDeleted: () => void
}

export function TrainingDetailModal({
  session,
  clients,
  officers,
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
  const [previewParticipant, setPreviewParticipant] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!session) return null

  const { officer, firm } = resolveCertificateContext(session, clients, officers)
  const participants = parseParticipants(session.participants)
  const displayParticipants = participants.length > 0 ? participants : ['Personal del despacho']
  const hasCertificate = Boolean(session.certificate_text)
  const certData = parseCertificateData(session.certificate_text)

  function buildPreviewHtml(stored?: string | null, onlyParticipant?: string) {
    const ctx = { training: session!, officer, firm }
    if (onlyParticipant) {
      return buildSingleParticipantCertificateHtml(ctx, onlyParticipant, stored)
    }
    return buildCertificateHtml(ctx, stored)
  }

  async function handleGenerate() {
    setGenerating(true)
    setCertError('')
    setCertInfo('')
    const result = await generateCertificateText({ training: session!, officer, firm })
    setGenerating(false)

    if (result.error && result.source === 'template') {
      setCertInfo('IA no disponible — se usó texto de reconocimiento estándar.')
    } else if (result.source === 'ai') {
      setCertInfo('Diploma generado con IA. Mismo formato para todos los participantes.')
    } else {
      setCertInfo('Diploma generado con formato estándar LFPIORPI.')
    }

    if (result.text) {
      await saveTrainingCertificate(session!.id, result.text)
      setPreviewParticipant(displayParticipants[0])
      setPreviewHtml(buildPreviewHtml(result.text, displayParticipants[0]))
      onUpdated()
    } else if (result.error) {
      setCertError(result.error)
    }
  }

  function showExistingCertificate() {
    setPreviewParticipant(displayParticipants[0])
    setPreviewHtml(buildPreviewHtml(session!.certificate_text, displayParticipants[0]))
  }

  function handlePrint() {
    const html = previewHtml || buildPreviewHtml(session!.certificate_text)
    openCertificatePrint(html)
  }

  function handleDownload() {
    const html = previewHtml || buildPreviewHtml(session!.certificate_text)
    const safeTitle = session!.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    downloadCertificateHtml(html, `constancia-${safeTitle}-${session!.session_date}.html`)
  }

  function handleDownloadOne(name: string) {
    const html = buildSingleParticipantCertificateHtml(
      { training: session!, officer, firm },
      name,
      session!.certificate_text,
    )
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
    downloadCertificateHtml(html, `reconocimiento-${safeName}-${session!.session_date}.html`)
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
          <dt>Cliente</dt><dd>{session.clients?.name ?? clients.find((c) => c.id === session.client_id)?.name ?? '—'}</dd>
          <dt>Oficial OC</dt><dd>{session.officers?.name ?? officers.find((o) => o.id === session.officer_id)?.name ?? officer.name}</dd>
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

        {session.evidence_path && (
          <div className="training-notes-block">
            <h4>Evidencia de asistencia</h4>
            <Button size="sm" variant="secondary" onClick={async () => {
              const url = await getTrainingEvidenceUrl(session.evidence_path!)
              if (url) window.open(url, '_blank')
            }}>
              <Download size={14} /> Descargar evidencia
            </Button>
          </div>
        )}

        <div className="certificate-panel">
          <h4><FileText size={16} /> Diploma / reconocimiento</h4>
          <p className="card-desc">
            Formato fijo tipo diploma. Si hay varios participantes, se genera un reconocimiento por persona con el mismo diseño.
          </p>
          {hasCertificate && (
            <p className="card-desc certificate-line-preview">
              <em>«{certData.recognitionLine}»</em>
            </p>
          )}
          <div className="certificate-actions">
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles size={16} /> {generating ? 'Generando...' : hasCertificate ? 'Regenerar diplomas' : 'Generar diplomas con IA'}
            </Button>
            {(hasCertificate || previewHtml) && (
              <>
                <Button variant="secondary" onClick={showExistingCertificate}><FileText size={16} /> Vista previa</Button>
                <Button variant="secondary" onClick={handlePrint}><Printer size={16} /> Imprimir todos</Button>
                <Button variant="secondary" onClick={handleDownload}><Download size={16} /> Descargar todos</Button>
              </>
            )}
          </div>
          {displayParticipants.length > 1 && (hasCertificate || previewHtml) && (
            <div className="certificate-participant-tabs">
              <span className="card-desc">Vista por participante:</span>
              <div className="participant-tab-row">
                {displayParticipants.map((name) => (
                  <Button
                    key={name}
                    size="sm"
                    variant={previewParticipant === name ? 'primary' : 'secondary'}
                    onClick={() => {
                      setPreviewParticipant(name)
                      setPreviewHtml(buildPreviewHtml(session.certificate_text, name))
                    }}
                  >
                    {name.split(' ').slice(0, 2).join(' ')}
                  </Button>
                ))}
              </div>
              {previewParticipant && (
                <Button size="sm" variant="ghost" onClick={() => handleDownloadOne(previewParticipant)}>
                  <Download size={14} /> Descargar solo {previewParticipant}
                </Button>
              )}
            </div>
          )}
          {certInfo && <p className="form-success">{certInfo}</p>}
          {certError && <p className="form-error">{certError}</p>}
          {(previewHtml || session.certificate_text) && (
            <div className="certificate-preview-wrap">
              <iframe
                title="Vista previa diploma"
                className="certificate-preview-frame"
                srcDoc={previewHtml || buildPreviewHtml(session.certificate_text, displayParticipants.length === 1 ? displayParticipants[0] : previewParticipant || displayParticipants[0])}
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
