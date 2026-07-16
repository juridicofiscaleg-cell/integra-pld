import { Link } from 'react-router-dom'
import { AlertTriangle, Check } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAlerts } from '../hooks/useData'
import { formatDate, isOverdue } from '../lib/utils'

export function AlertsPage() {
  const { alerts, loading } = useAlerts()

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Alertas</h1>
          <p>Vencimientos, recordatorios y tareas pendientes</p>
        </div>
        <Button variant="secondary">
          <Check size={16} /> Marcar todas como leídas
        </Button>
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
              <AlertTriangle size={20} className="alert-card-icon" />
              <div className="alert-card-body">
                <div className="alert-card-top">
                  <strong>{alert.title}</strong>
                  <Badge variant="warning">{alert.alert_type}</Badge>
                </div>
                {alert.message && <p>{alert.message}</p>}
                <div className="alert-card-meta">
                  {alert.clients && (
                    <Link to={`/clientes/${alert.client_id}`}>{alert.clients.name}</Link>
                  )}
                  {alert.expediente_id && (
                    <Link to={`/expedientes/${alert.expediente_id}`}>
                      Ver expediente →
                    </Link>
                  )}
                  {alert.due_date && (
                    <span className={isOverdue(alert.due_date) ? 'overdue-text' : ''}>
                      Vence: {formatDate(alert.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
