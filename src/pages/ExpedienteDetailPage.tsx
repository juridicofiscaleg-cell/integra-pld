import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Timeline } from '../components/timeline/Timeline'
import { StageNotesModal } from '../components/timeline/StageNotesModal'
import { DocumentsPanel } from '../components/documents/DocumentsPanel'
import { ClientUpdateEmailModal } from '../components/expedientes/ClientUpdateEmailModal'
import { DiagnosisPanel } from '../components/expedientes/DiagnosisPanel'
import { ExpedienteComments } from '../components/expedientes/ExpedienteComments'
import { EditExpedienteModal } from '../components/expedientes/EditExpedienteModal'
import { useExpediente, useProfiles } from '../hooks/useData'
import { advanceStage, deleteExpediente, revertStage, updateStageNotes } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useProtectedAction } from '../hooks/useProtectedAction'
import { canDelete as roleCanDelete, needsApprovalForSensitive } from '../lib/permissions'
import { MATTER_TYPE_LABELS, STATUS_LABELS } from '../lib/types'
import { getProgressPercent } from '../lib/workflows'
import { formatDate } from '../lib/utils'

export function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { runSensitiveAction } = useProtectedAction()
  const { profiles } = useProfiles()
  const { expediente, stages, loading, refetch } = useExpediente(id ?? '')
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')
  const [emailOpen, setEmailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingStage, setPendingStage] = useState<number | null>(null)

  const mayDelete = roleCanDelete(profile?.role) || needsApprovalForSensitive(profile?.role)
  const assignee = profiles.find((p) => p.id === expediente?.assigned_to)

  if (loading) return <div className="page"><p className="loading">Cargando...</p></div>

  if (!expediente) {
    return (
      <div className="page">
        <p>Expediente no encontrado. <Link to="/expedientes">Volver</Link></p>
      </div>
    )
  }

  const progress = getProgressPercent(expediente.current_stage_index, stages.length)
  const isClosed = expediente.status === 'cerrado' || expediente.status === 'archivado'

  async function handleAdvanceWithNotes(notes: string) {
    if (!id || pendingStage === null || !expediente) return
    setAdvancing(true)
    setError('')
    const result = await runSensitiveAction({
      actionType: 'advance_stage',
      title: `Avanzar etapa en: ${expediente.title}`,
      clientId: expediente.client_id,
      payload: { expedienteId: id, stageIndex: pendingStage, notes },
      direct: () => advanceStage(id, pendingStage, user?.id, notes),
    })
    setAdvancing(false)
    setPendingStage(null)
    if (result.error) setError(result.error)
    else if (result.pending) setError('Avance de etapa enviado a Autorizaciones.')
    else refetch()
  }

  async function handleRevert(stageIndex: number) {
    if (!id || !confirm('¿Deshacer esta etapa completada?')) return
    setAdvancing(true)
    setError('')
    const result = await revertStage(id, stageIndex, user?.id)
    setAdvancing(false)
    if (result.error) setError(result.error)
    else refetch()
  }

  async function handleDelete() {
    if (!id || !expediente) return
    setDeleting(true)
    const exp = expediente
    const result = await runSensitiveAction({
      actionType: 'delete_expediente',
      title: `Eliminar expediente: ${exp.title}`,
      clientId: exp.client_id,
      payload: { expedienteId: id },
      direct: () => deleteExpediente(id, user?.id),
    })
    setDeleting(false)
    if (result.pending) {
      setDeleteOpen(false)
      setError('Eliminación solicitada — pendiente de autorización.')
    } else if (result.error) setError(result.error)
    else navigate('/expedientes')
  }

  return (
    <div className="page">
      <Link to="/expedientes" className="back-link">
        <ArrowLeft size={16} /> Expedientes
      </Link>

      <header className="page-header">
        <div>
          <h1>{expediente.title}</h1>
          <p>
            <Link to={`/clientes/${expediente.client_id}`}>{expediente.clients?.name}</Link>
            {' · '}Abierto {formatDate(expediente.opened_at)}
            {assignee && ` · Responsable: ${assignee.full_name}`}
          </p>
        </div>
        <div className="header-actions">
          <Badge variant="info">{MATTER_TYPE_LABELS[expediente.matter_type]}</Badge>
          <Badge variant={isClosed ? 'muted' : 'success'}>{STATUS_LABELS[expediente.status]}</Badge>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={16} /> Editar
          </Button>
          <Button variant="secondary" onClick={() => setEmailOpen(true)}>
            <Mail size={16} /> Avisar cliente
          </Button>
          {mayDelete && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} /> Eliminar
            </Button>
          )}
        </div>
      </header>

      <div className="progress-overview">
        <div className="progress-bar large">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>
          Progreso: {progress}% — Etapa {Math.min(expediente.current_stage_index + 1, stages.length)} de {stages.length}
          {advancing && ' · Actualizando...'}
        </span>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="detail-grid">
        <section className="card card-wide">
          <h2>Timeline del proceso</h2>
          <Timeline
            stages={stages}
            currentIndex={expediente.current_stage_index}
            readonly={advancing || isClosed}
            onAdvance={(idx) => setPendingStage(idx)}
            onRevert={handleRevert}
            onEditNotes={async (stageId, notes) => {
              if (!expediente) return
              const result = await runSensitiveAction({
                actionType: 'update_stage_notes',
                title: `Notas de etapa — ${expediente.title}`,
                clientId: expediente.client_id,
                payload: { stageId, notes },
                direct: () => updateStageNotes(stageId, notes, user?.id),
              })
              if (result.pending) setError('Cambio enviado a Autorizaciones.')
              else refetch()
            }}
          />
        </section>

        <section className="card">
          <h2>Detalles</h2>
          <dl className="detail-list">
            <dt>Prioridad</dt><dd>{expediente.priority}</dd>
            <dt>Estado</dt><dd>{STATUS_LABELS[expediente.status]}</dd>
            <dt>Responsable</dt><dd>{assignee?.full_name ?? '—'}</dd>
            <dt>Descripción</dt><dd>{expediente.description ?? '—'}</dd>
            <dt>Última actualización</dt><dd>{formatDate(expediente.updated_at)}</dd>
            {expediente.closed_at && (
              <>
                <dt>Cerrado</dt><dd>{formatDate(expediente.closed_at)}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="card">
          <h2>Comentarios internos</h2>
          <ExpedienteComments expedienteId={expediente.id} />
        </section>

        {(expediente.matter_type === 'diagnostico_pld' || expediente.matter_type === 'pld') && (
          <section className="card card-wide">
            <h2>Diagnóstico PLD — Gap analysis</h2>
            <DiagnosisPanel expediente={expediente} onUpdated={refetch} />
          </section>
        )}

        <section className="card">
          <h2>Documentos</h2>
          <DocumentsPanel expedienteId={expediente.id} clientId={expediente.client_id} />
        </section>
      </div>

      <StageNotesModal
        open={pendingStage !== null}
        stageName={pendingStage !== null ? stages.find((s) => s.stage_index === pendingStage)?.name ?? '' : ''}
        onClose={() => setPendingStage(null)}
        onConfirm={handleAdvanceWithNotes}
        loading={advancing}
      />

      <EditExpedienteModal
        expediente={editOpen ? expediente : null}
        profiles={profiles}
        onClose={() => setEditOpen(false)}
        onUpdated={refetch}
      />

      <ClientUpdateEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        client={expediente.clients}
        expediente={expediente}
        stages={stages}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar expediente"
        message={`¿Eliminar "${expediente.title}" y todo su historial?`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
