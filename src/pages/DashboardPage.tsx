import { Link } from 'react-router-dom'
import { AlertTriangle, Calendar, FileCheck, FolderOpen, GraduationCap, Shield, ShieldCheck, Users } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { useApprovalRequests } from '../hooks/useApprovalRequests'
import { canReviewApprovals, needsApprovalForSensitive } from '../lib/permissions'
import {
  useActivity,
  useAlerts,
  useClients,
  useComplianceManuals,
  useComplianceOfficers,
  useExpedientes,
  useKycRecords,
  usePldOperations,
  useProfiles,
  useTrainingSessions,
  useUnusualNotices,
} from '../hooks/useData'
import { getClientCompliance } from '../lib/compliance'
import { MATTER_TYPE_LABELS, RISK_LABELS } from '../lib/types'
import { getProgressPercent, getWorkflowStages } from '../lib/workflows'
import { formatDate, formatRelative } from '../lib/utils'
import { differenceInDays, differenceInHours, parseISO, subMonths } from 'date-fns'

export function DashboardPage() {
  const { user, profile } = useAuth()
  const { pending: pendingApprovals, requests: approvalRequests } = useApprovalRequests()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords } = useKycRecords()
  const { alerts } = useAlerts()
  const { activity } = useActivity()
  const { operations } = usePldOperations()
  const { notices } = useUnusualNotices()
  const { officers } = useComplianceOfficers()
  const { manuals } = useComplianceManuals()
  const { sessions: trainings } = useTrainingSessions()
  const { profiles } = useProfiles()

  const profileName = profiles.find((p) => p.id === user?.id)
  const myPendingApprovals = approvalRequests.filter(
    (r) => r.status === 'pendiente' && r.requested_by === user?.id,
  )
  const isAssistant = needsApprovalForSensitive(profile?.role)

  const activeExpedientes = expedientes.filter((e) => e.status === 'activo')
  const myExpedientes = activeExpedientes.filter((e) => e.assigned_to === user?.id)
  const myAlerts = alerts.filter((a) => a.assigned_to === user?.id || (!a.assigned_to && a.created_by === user?.id))
  const pendingKyc = kycRecords.filter((k) => k.status === 'pendiente' || k.status === 'en_revision')
  const expiringKyc = kycRecords.filter((k) => {
    if (!k.expires_at || k.status === 'vencido') return k.status === 'vencido'
    const days = Math.ceil((new Date(k.expires_at).getTime() - Date.now()) / 86400000)
    return days <= 30
  })
  const staleExpedientes = activeExpedientes.filter(
    (e) => differenceInDays(new Date(), parseISO(e.updated_at)) > 7,
  )
  const opsUnreported = operations.filter((o) => o.unusual && !o.reported)
  const noticesDraft = notices.filter((n) => n.status === 'borrador')
  const h24Urgent = notices.filter((n) => n.notice_type === '24h' && n.status === 'borrador' && differenceInHours(new Date(), parseISO(n.detected_at)) >= 12)
  const vulnerableClients = clients.filter((c) => c.vulnerable_activity)
  const yearAgo = subMonths(new Date(), 12)

  const complianceIssues = clients
    .map((c) => ({
      client: c,
      summary: getClientCompliance(c, kycRecords, expedientes, alerts, operations, notices, officers, manuals, trainings),
    }))
    .filter(({ summary }) => summary.status !== 'verde')

  const missingOfficer = vulnerableClients.filter(
    (c) => !officers.some((o) => o.client_id === c.id && o.is_active),
  )
  const missingManual = vulnerableClients.filter(
    (c) => !manuals.some((m) => m.client_id === c.id && m.is_active),
  )
  const missingTraining = vulnerableClients.filter(
    (c) => !trainings.some((t) => t.client_id === c.id && parseISO(t.session_date) >= yearAgo),
  )

  const stats = [
    { label: 'Clientes', value: clients.length, icon: Users, to: '/clientes' },
    { label: 'Expedientes activos', value: activeExpedientes.length, icon: FolderOpen, to: '/expedientes' },
    { label: 'KYC pendientes', value: pendingKyc.length, icon: FileCheck, to: '/kyc' },
    { label: 'Alertas', value: alerts.filter((a) => !a.resolved).length, icon: AlertTriangle, to: '/alertas' },
  ]

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Vista general de tu despacho — {profileName?.full_name ?? 'Equipo'}</p>
        </div>
        <Link to="/calendario" className="btn-link">
          <Calendar size={16} /> Calendario
        </Link>
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

      <section className="card card-wide mi-bandeja-section">
        <div className="client-ops-header">
          <h2>Mi bandeja — hoy</h2>
          {(canReviewApprovals(profile?.role) && pendingApprovals.length > 0) && (
            <Link to="/autorizaciones" className="btn-link">
              <ShieldCheck size={16} /> {pendingApprovals.length} autorización(es) pendiente(s)
            </Link>
          )}
          {isAssistant && myPendingApprovals.length > 0 && (
            <span className="cell-sub">{myPendingApprovals.length} solicitud(es) en espera de tu abogado</span>
          )}
        </div>
        <div className="my-day-grid">
          <div>
            <h3>Prioridad inmediata</h3>
            {(h24Urgent.length === 0 && expiringKyc.length === 0 && myAlerts.length === 0) ? (
              <p className="empty-state compact">Sin urgencias</p>
            ) : (
              <>
                {h24Urgent.slice(0, 2).map((n) => (
                  <Link key={n.id} to="/operaciones" className="mini-list-item">
                    <strong>Aviso 24h</strong><span>{n.clients?.name}</span>
                  </Link>
                ))}
                {expiringKyc.slice(0, 2).map((k) => (
                  <Link key={k.id} to={`/kyc?kyc=${k.id}`} className="mini-list-item">
                    <strong>KYC</strong><span>{k.clients?.name}</span>
                  </Link>
                ))}
                {myAlerts.slice(0, 2).map((a) => (
                  <Link key={a.id} to={a.client_id ? `/clientes/${a.client_id}` : '/alertas'} className="mini-list-item">
                    <strong>{a.title}</strong>
                  </Link>
                ))}
              </>
            )}
          </div>
          <div>
            <h3>Accesos rápidos</h3>
            <div className="mini-list">
              <Link to="/clientes" className="mini-list-item"><strong>Nuevo cliente / consultar</strong></Link>
              <Link to="/operaciones?cliente=" className="mini-list-item"><strong>Registrar operación</strong></Link>
              <Link to="/calendario" className="mini-list-item"><strong>Calendario PLD</strong></Link>
              {canReviewApprovals(profile?.role) && (
                <Link to="/autorizaciones" className="mini-list-item"><strong>Autorizaciones del equipo</strong></Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card card-wide">
        <h2>Cumplimiento PLD (Arts. 52–54)</h2>
        <div className="compliance-stats">
          <Link to="/cumplimiento" className="stat-chip">
            <Shield size={18} />
            <span>{missingOfficer.length} sin oficial</span>
          </Link>
          <Link to="/cumplimiento" className="stat-chip">
            <GraduationCap size={18} />
            <span>{missingTraining.length} sin capacitación 12m</span>
          </Link>
          <Link to="/operaciones" className="stat-chip">
            <AlertTriangle size={18} />
            <span>{h24Urgent.length} avisos 24h urgentes</span>
          </Link>
          <Link to="/clientes" className="stat-chip">
            <span>{complianceIssues.filter((x) => x.summary.status === 'rojo').length} clientes en rojo</span>
          </Link>
        </div>
        {complianceIssues.length > 0 && (
          <div className="mini-list" style={{ marginTop: '1rem' }}>
            {complianceIssues.slice(0, 5).map(({ client, summary }) => (
              <Link key={client.id} to={`/clientes/${client.id}`} className="mini-list-item">
                <strong>{client.name}</strong>
                <Badge variant={summary.status === 'rojo' ? 'danger' : 'warning'}>{summary.label}</Badge>
                <span>{summary.issues[0]}</span>
              </Link>
            ))}
          </div>
        )}
        {missingManual.length > 0 && (
          <p className="dashboard-note">{missingManual.length} cliente(s) vulnerable(s) sin manual PLD vigente</p>
        )}
      </section>

      <section className="card card-wide my-day-section">
        <h2>Mi día</h2>
        <div className="my-day-grid">
          <div>
            <h3>Mis expedientes ({myExpedientes.length})</h3>
            {myExpedientes.length === 0 ? (
              <p className="empty-state">Sin expedientes asignados</p>
            ) : (
              myExpedientes.slice(0, 5).map((exp) => (
                <Link key={exp.id} to={`/expedientes/${exp.id}`} className="mini-list-item">
                  <strong>{exp.title}</strong>
                  <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                </Link>
              ))
            )}
          </div>
          <div>
            <h3>Mis alertas ({myAlerts.length})</h3>
            {myAlerts.length === 0 ? (
              <p className="empty-state">Sin alertas asignadas</p>
            ) : (
              myAlerts.slice(0, 5).map((a) => (
                <Link key={a.id} to={a.client_id ? `/clientes/${a.client_id}` : '/alertas'} className="mini-list-item">
                  <strong>{a.title}</strong>
                  {a.due_date && <span>Vence {formatDate(a.due_date)}</span>}
                </Link>
              ))
            )}
          </div>
          <div>
            <h3>KYC esta semana</h3>
            {expiringKyc.length === 0 ? (
              <p className="empty-state">Nada urgente</p>
            ) : (
              expiringKyc.slice(0, 5).map((k) => (
                <Link key={k.id} to={`/clientes/${k.client_id}`} className="mini-list-item">
                  <strong>{k.clients?.name}</strong>
                  <Badge variant={k.status === 'vencido' ? 'danger' : 'warning'}>
                    {k.status === 'vencido' ? 'Vencido' : formatDate(k.expires_at)}
                  </Badge>
                </Link>
              ))
            )}
          </div>
          <div>
            <h3>PLD — pendientes</h3>
            {opsUnreported.length === 0 && noticesDraft.length === 0 ? (
              <p className="empty-state">Sin pendientes PLD</p>
            ) : (
              <>
                {opsUnreported.slice(0, 3).map((o) => (
                  <Link key={o.id} to={`/clientes/${o.client_id}`} className="mini-list-item">
                    <strong>Op. sin reportar</strong>
                    <span>{o.clients?.name}</span>
                  </Link>
                ))}
                {noticesDraft.slice(0, 3).map((n) => (
                  <Link key={n.id} to="/operaciones" className="mini-list-item">
                    <strong>Aviso borrador</strong>
                    <span>{n.title}</span>
                  </Link>
                ))}
                {h24Urgent.slice(0, 2).map((n) => (
                  <Link key={n.id} to="/operaciones" className="mini-list-item">
                    <strong>Aviso 24h urgente</strong>
                    <span>{n.clients?.name}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
          <div>
            <h3>Estancados +7 días ({staleExpedientes.length})</h3>
            {staleExpedientes.length === 0 ? (
              <p className="empty-state">Todo con movimiento reciente</p>
            ) : (
              staleExpedientes.slice(0, 5).map((e) => (
                <Link key={e.id} to={`/expedientes/${e.id}`} className="mini-list-item">
                  <strong>{e.title}</strong>
                  <span>Último mov. {formatRelative(e.updated_at)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

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
          {alerts.filter((a) => !a.resolved).length === 0 ? (
            <p className="empty-state">Sin alertas pendientes</p>
          ) : (
            <div className="alert-list">
              {alerts.filter((a) => !a.resolved).map((alert) => (
                <Link key={alert.id} to={alert.client_id ? `/clientes/${alert.client_id}` : '/alertas'} className="alert-row">
                  <AlertTriangle size={16} className="alert-icon" />
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.clients?.name}</span>
                    {alert.due_date && (
                      <span className="alert-due">Vence: {formatDate(alert.due_date)}</span>
                    )}
                  </div>
                </Link>
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
          <Link to="/bitacora" className="btn-link">Ver bitácora completa →</Link>
        </section>

        <section className="card">
          <h2>Clientes por riesgo</h2>
          <div className="risk-summary">
            {(['bajo', 'medio', 'alto', 'critico'] as const).map((level) => {
              const count = clients.filter((c) => (c.matrix_risk_level ?? c.risk_level) === level).length
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
      </div>
    </div>
  )
}
