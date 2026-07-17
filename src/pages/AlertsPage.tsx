import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { NewAlertModal } from '../components/alerts/NewAlertModal'
import { resolveAlert, resolveAllAlerts } from '../lib/api'
import { useAlerts, useClients, useExpedientes, useProfiles } from '../hooks/useData'
import { formatDate, isOverdue } from '../lib/utils'

const alertTypeLabels: Record<string, string> = {
  vencimiento: 'Vencimiento',
  kyc: 'KYC',
  etapa: 'Etapa',
  documento: 'Documento',
  general: 'General',
}

export function AlertsPage() {
  const { alerts, loading, refetch } = useAlerts()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { profiles } = useProfiles()
  const [resolving, setResolving] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = alerts.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && a.alert_type !== typeFilter) return false
    return true
  })

  async function handleResolve(alertId: string) {
    setResolving(alertId)
    await resolveAlert(alertId)
    setResolving(null)
    refetch()
  }

  async function handleResolveAll() {
    setResolving('all')
    await resolveAllAlerts()
    setResolving(null)
    refetch()
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Alertas y tareas</h1>
          <p>{filtered.length} pendientes</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nueva alerta
          </Button>
          {alerts.length > 0 && (
            <Button variant="secondary" disabled={resolving === 'all'} onClick={handleResolveAll}>
              <Check size={16} /> Resolver todas
            </Button>
          )}
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar alerta..."
        filters={[{
          label: 'Tipo',
          value: typeFilter,
          onChange: setTypeFilter,
          options: [
            { value: '', label: 'Todos' },
            ...Object.entries(alertTypeLabels).map(([k, v]) => ({ value: k, label: v })),
          ],
        }]}
      />

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <Check size={48} />
          <h2>Sin alertas pendientes</h2>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Crear tarea</Button>
        </div>
      ) : (
        <div className="alert-cards">
          {filtered.map((alert) => {
            const assignee = profiles.find((p) => p.id === alert.assigned_to)
            return (
              <div key={alert.id} className={`alert-card ${alert.due_date && isOverdue(alert.due_date) ? 'overdue' : ''}`}>
                <div className="alert-card-body">
                  <div className="alert-card-top">
                    <strong>{alert.title}</strong>
                    <Badge variant="warning">{alertTypeLabels[alert.alert_type] ?? alert.alert_type}</Badge>
                  </div>
                  {alert.message && <p>{alert.message.replace(/kyc:[a-f0-9-]+ — /, '')}</p>}
                  <div className="alert-card-meta">
                    {alert.clients && <Link to={`/clientes/${alert.client_id}`}>{alert.clients.name}</Link>}
                    {alert.expediente_id && <Link to={`/expedientes/${alert.expediente_id}`}>Ver expediente →</Link>}
                    {assignee && <span>Responsable: {assignee.full_name}</span>}
                    {alert.due_date && (
                      <span className={isOverdue(alert.due_date) ? 'overdue-text' : ''}>
                        Vence: {formatDate(alert.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="secondary" disabled={resolving === alert.id} onClick={() => handleResolve(alert.id)}>
                  <Check size={14} /> Resolver
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <NewAlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
        clients={clients}
        expedientes={expedientes}
        profiles={profiles}
      />
    </div>
  )
}
