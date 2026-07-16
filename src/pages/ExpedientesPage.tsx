import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NewExpedienteModal } from '../components/expedientes/NewExpedienteModal'
import { useClients, useExpedientes } from '../hooks/useData'
import { MATTER_TYPE_LABELS, STATUS_LABELS } from '../lib/types'
import { getProgressPercent, getWorkflowStages } from '../lib/workflows'
import { formatDate } from '../lib/utils'

const priorityVariant = {
  baja: 'muted' as const,
  media: 'info' as const,
  alta: 'warning' as const,
  urgente: 'danger' as const,
}

const statusVariant = {
  activo: 'success' as const,
  pausado: 'warning' as const,
  cerrado: 'muted' as const,
  archivado: 'muted' as const,
}

export function ExpedientesPage() {
  const { expedientes, loading, refetch } = useExpedientes()
  const { clients } = useClients()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Expedientes</h1>
          <p>Seguimiento de asuntos y etapas del proceso</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo expediente
        </Button>
      </header>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : expedientes.length === 0 ? (
        <div className="empty-card">
          <h2>Sin expedientes aún</h2>
          <p>Crea un expediente para iniciar el seguimiento de un asunto.</p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nuevo expediente
          </Button>
        </div>
      ) : (
        <div className="expediente-cards">
          {expedientes.map((exp) => {
            const totalStages = getWorkflowStages(exp.matter_type).length
            const progress = getProgressPercent(exp.current_stage_index, totalStages)
            return (
              <Link key={exp.id} to={`/expedientes/${exp.id}`} className="expediente-card">
                <div className="expediente-card-header">
                  <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                  <Badge variant={statusVariant[exp.status]}>{STATUS_LABELS[exp.status]}</Badge>
                </div>
                <h3>{exp.title}</h3>
                <p className="expediente-client">{exp.clients?.name}</p>
                {exp.description && <p className="expediente-desc">{exp.description}</p>}
                <div className="expediente-card-footer">
                  <Badge variant={priorityVariant[exp.priority]}>{exp.priority}</Badge>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span>{progress}%</span>
                </div>
                <span className="expediente-date">Abierto: {formatDate(exp.opened_at)}</span>
              </Link>
            )
          })}
        </div>
      )}

      <NewExpedienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clients={clients}
        onCreated={refetch}
      />
    </div>
  )
}
