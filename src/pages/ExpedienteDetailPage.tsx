import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Timeline } from '../components/timeline/Timeline'
import { DocumentsPanel } from '../components/documents/DocumentsPanel'
import { useExpediente } from '../hooks/useData'
import { advanceStage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MATTER_TYPE_LABELS, STATUS_LABELS } from '../lib/types'
import { getProgressPercent } from '../lib/workflows'
import { formatDate } from '../lib/utils'

export function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { expediente, stages, loading, refetch } = useExpediente(id ?? '')
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')

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

  async function handleAdvance(stageIndex: number) {
    if (!id) return
    setAdvancing(true)
    setError('')
    const result = await advanceStage(id, stageIndex, user?.id)
    setAdvancing(false)
    if (result.error) {
      setError(result.error)
      return
    }
    refetch()
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
          </p>
        </div>
        <div className="header-badges">
          <Badge variant="info">{MATTER_TYPE_LABELS[expediente.matter_type]}</Badge>
          <Badge variant={isClosed ? 'muted' : 'success'}>{STATUS_LABELS[expediente.status]}</Badge>
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
            readonly={isClosed || advancing}
            onAdvance={handleAdvance}
          />
        </section>

        <section className="card">
          <h2>Detalles</h2>
          <dl className="detail-list">
            <dt>Prioridad</dt><dd>{expediente.priority}</dd>
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
          <h2>Documentos</h2>
          <DocumentsPanel
            expedienteId={expediente.id}
            clientId={expediente.client_id}
          />
        </section>
      </div>
    </div>
  )
}
