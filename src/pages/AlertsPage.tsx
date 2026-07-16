import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { resolveAlert, resolveAllAlerts } from '../lib/api'
import { useAlerts } from '../hooks/useData'
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
  const [resolving, setResolving] = useState<string | null>(null)

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
          <h1>Alertas</h1>
          <p>Vencimientos KYC, recordatorios y tareas pendientes</p>
        </div>
        {alerts.length > 0 && (
          <Button variant="secondary" disabled={resolving === 'all'} onClick={handleResolveAll}>
            <Check size={16} /> Marcar todas como resueltas
          </Button>
        )}
      </header>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : alerts.length === 0 ? (
        <div className="empty-card">
          <Check size={48} />
          <h2>Sin alertas pendientes</h2>
          <p>Todo al día.</p>
        </div>
      ) : (
        <div className="alert-cards">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-card ${alert.due_date && isOverdue(alert.due_date) ? 'overdue' : ''}`}
            >
              <div className="alert-card-body">
                <div className="alert-card-top">
                  <strong>{alert.title}</strong>
                  <Badge variant="warning">{alertTypeLabels[alert.alert_type] ?? alert.alert_type}</Badge>
                </div>
                {alert.message && <p>{alert.message.replace(/kyc:[a-f0-9-]+ — /, '')}</p>}
                <div className="alert-card-meta">
                  {alert.clients && (
                    <Link to={`/clientes/${alert.client_id}`}>{alert.clients.name}</Link>
                  )}
                  {alert.expediente_id && (
                    <Link to={`/expedientes/${alert.expediente_id}`}>Ver expediente →</Link>
                  )}
                  {alert.due_date && (
                    <span className={isOverdue(alert.due_date) ? 'overdue-text' : ''}>
                      Vence: {formatDate(alert.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={resolving === alert.id}
                onClick={() => handleResolve(alert.id)}
              >
                <Check size={14} /> Resolver
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
