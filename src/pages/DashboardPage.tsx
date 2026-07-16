import { Link } from 'react-router-dom'
import { AlertTriangle, FileCheck, FolderOpen, Users } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { useActivity, useAlerts, useClients, useExpedientes, useKycRecords } from '../hooks/useData'
import { MATTER_TYPE_LABELS, RISK_LABELS } from '../lib/types'
import { getProgressPercent, getWorkflowStages } from '../lib/workflows'
import { formatDate, formatRelative } from '../lib/utils'

export function DashboardPage() {
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords } = useKycRecords()
  const { alerts } = useAlerts()
  const { activity } = useActivity()

  const activeExpedientes = expedientes.filter((e) => e.status === 'activo')
  const pendingKyc = kycRecords.filter((k) => k.status === 'pendiente' || k.status === 'en_revision')
  const expiringKyc = kycRecords.filter((k) => {
    if (!k.expires_at || k.status === 'vencido') return k.status === 'vencido'
    const days = Math.ceil((new Date(k.expires_at).getTime() - Date.now()) / 86400000)
    return days <= 30
  })
  const vulnerableClients = clients.filter((c) => c.vulnerable_activity)

  const stats = [
    { label: 'Clientes', value: clients.length, icon: Users, to: '/clientes' },
    { label: 'Expedientes activos', value: activeExpedientes.length, icon: FolderOpen, to: '/expedientes' },
    { label: 'KYC pendientes', value: pendingKyc.length, icon: FileCheck, to: '/kyc' },
    { label: 'Alertas', value: alerts.length, icon: AlertTriangle, to: '/alertas' },
  ]

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Vista general de tu despacho</p>
        </div>
      </header>

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="stat-card">
            <Icon size={24} />
            <div>
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Expedientes en curso</h2>
          <div className="expediente-list">
            {activeExpedientes.map((exp) => {
              const totalStages = getWorkflowStages(exp.matter_type).length
              const progress = getProgressPercent(exp.current_stage_index, totalStages)
              return (
                <Link key={exp.id} to={`/expedientes/${exp.id}`} className="expediente-row">
                  <div>
                    <strong>{exp.title}</strong>
                    <span>{exp.clients?.name}</span>
                  </div>
                  <div className="expediente-meta">
                    <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h2>Alertas pendientes</h2>
          {alerts.length === 0 ? (
            <p className="empty-state">Sin alertas pendientes</p>
          ) : (
            <div className="alert-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="alert-row">
                  <AlertTriangle size={16} className="alert-icon" />
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.clients?.name}</span>
                    {alert.due_date && (
                      <span className="alert-due">Vence: {formatDate(alert.due_date)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Actividad reciente</h2>
          <div className="activity-list">
            {activity.map((act) => (
              <div key={act.id} className="activity-row">
                <div className="activity-dot" />
                <div>
                  <p>{act.description}</p>
                  <span>{formatRelative(act.created_at)} — {act.profiles?.full_name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Clientes por riesgo</h2>
          <div className="risk-summary">
            {(['bajo', 'medio', 'alto', 'critico'] as const).map((level) => {
              const count = clients.filter((c) => c.risk_level === level).length
              const variant = level === 'bajo' ? 'success' : level === 'medio' ? 'warning' : 'danger'
              return (
                <div key={level} className="risk-item">
                  <Badge variant={variant}>{RISK_LABELS[level]}</Badge>
                  <span>{count}</span>
                </div>
              )
            })}
          </div>
          {vulnerableClients.length > 0 && (
            <p className="dashboard-note">
              {vulnerableClients.length} cliente(s) con actividad vulnerable
            </p>
          )}
        </section>

        <section className="card">
          <h2>KYC — atención requerida</h2>
          {expiringKyc.length === 0 ? (
            <p className="empty-state">Sin KYC vencidos o por vencer</p>
          ) : (
            <div className="mini-list">
              {expiringKyc.slice(0, 5).map((kyc) => (
                <Link key={kyc.id} to={`/clientes/${kyc.client_id}`} className="mini-list-item">
                  <strong>{kyc.clients?.name}</strong>
                  <Badge variant={kyc.status === 'vencido' ? 'danger' : 'warning'}>
                    {kyc.status === 'vencido' ? 'Vencido' : `Vence ${formatDate(kyc.expires_at)}`}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
