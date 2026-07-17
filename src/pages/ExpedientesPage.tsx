import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { NewExpedienteModal } from '../components/expedientes/NewExpedienteModal'
import { useClients, useExpedientes, useProfiles } from '../hooks/useData'
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
  const { profiles } = useProfiles()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assignFilter, setAssignFilter] = useState('')

  const filtered = useMemo(() => {
    return expedientes.filter((e) => {
      const q = search.toLowerCase()
      if (q && !e.title.toLowerCase().includes(q) && !(e.clients?.name ?? '').toLowerCase().includes(q)) return false
      if (statusFilter && e.status !== statusFilter) return false
      if (priorityFilter && e.priority !== priorityFilter) return false
      if (assignFilter && e.assigned_to !== assignFilter) return false
      return true
    })
  }, [expedientes, search, statusFilter, priorityFilter, assignFilter])

  function assigneeName(id?: string) {
    if (!id) return null
    return profiles.find((p) => p.id === id)?.full_name
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Expedientes</h1>
          <p>{filtered.length} de {expedientes.length} asuntos</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo expediente
        </Button>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar título o cliente..."
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [{ value: '', label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))],
          },
          {
            label: 'Prioridad',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { value: '', label: 'Todas' },
              { value: 'baja', label: 'Baja' },
              { value: 'media', label: 'Media' },
              { value: 'alta', label: 'Alta' },
              { value: 'urgente', label: 'Urgente' },
            ],
          },
          {
            label: 'Responsable',
            value: assignFilter,
            onChange: setAssignFilter,
            options: [{ value: '', label: 'Todos' }, ...profiles.map((p) => ({ value: p.id, label: p.full_name }))],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <h2>Sin expedientes</h2>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nuevo expediente</Button>
        </div>
      ) : (
        <div className="expediente-cards">
          {filtered.map((exp) => {
            const totalStages = getWorkflowStages(exp.matter_type).length
            const progress = getProgressPercent(exp.current_stage_index, totalStages)
            const assignee = assigneeName(exp.assigned_to)
            return (
              <Link key={exp.id} to={`/expedientes/${exp.id}`} className="expediente-card">
                <div className="expediente-card-header">
                  <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                  <Badge variant={statusVariant[exp.status]}>{STATUS_LABELS[exp.status]}</Badge>
                </div>
                <h3>{exp.title}</h3>
                <p className="expediente-client">{exp.clients?.name}</p>
                {assignee && <p className="expediente-assignee">Responsable: {assignee}</p>}
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

      <NewExpedienteModal open={modalOpen} onClose={() => setModalOpen(false)} clients={clients} profiles={profiles} onCreated={refetch} />
    </div>
  )
}
