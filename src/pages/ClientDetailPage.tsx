import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Link2, Mail, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EditClientModal } from '../components/clients/EditClientModal'
import { ClientEmailTemplatesModal } from '../components/clients/ClientEmailTemplatesModal'
import { ComplianceBadge } from '../components/clients/ComplianceBadge'
import { ClientTimeline } from '../components/clients/ClientTimeline'
import { ClientCompliancePanel } from '../components/clients/ClientCompliancePanel'
import { ClientOperationsPanel } from '../components/operations/ClientOperationsPanel'
import { RiskMatrixPanel } from '../components/kyc/RiskMatrixPanel'
import { SanctionsPanel } from '../components/kyc/SanctionsPanel'
import { deleteClient, exportClientBundleZip, createClientPortalToken } from '../lib/api'
import { getClientCompliance } from '../lib/compliance'
import { useAuth } from '../context/AuthContext'
import { useProtectedAction } from '../hooks/useProtectedAction'
import {
  useAlerts,
  useClientActivity,
  useClients,
  useComplianceManuals,
  useComplianceOfficers,
  useExpedientes,
  useKycRecords,
  usePldOperations,
  useTrainingSessions,
  useUnusualNotices,
} from '../hooks/useData'
import { MATTER_TYPE_LABELS, RISK_LABELS } from '../lib/types'
import { DocumentsPanel } from '../components/documents/DocumentsPanel'
import { canDelete as roleCanDelete, canExportBundle, needsApprovalForSensitive } from '../lib/permissions'
import { formatDate } from '../lib/utils'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { clients, refetch } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords, refetch: refetchKyc } = useKycRecords()
  const { alerts } = useAlerts()
  const { operations, refetch: refetchOps } = usePldOperations()
  const { notices, refetch: refetchNotices } = useUnusualNotices()
  const { officers } = useComplianceOfficers()
  const { manuals } = useComplianceManuals()
  const { sessions: trainings } = useTrainingSessions()
  const { activity } = useClientActivity(id ?? '')
  const [editing, setEditing] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [actionInfo, setActionInfo] = useState('')
  const { runSensitiveAction, requiresApproval } = useProtectedAction()

  const canDelete = roleCanDelete(profile?.role) || needsApprovalForSensitive(profile?.role)
  const canExport = canExportBundle(profile?.role) || needsApprovalForSensitive(profile?.role)
  const client = clients.find((c) => c.id === id)
  const clientExpedientes = expedientes.filter((e) => e.client_id === id)
  const clientKyc = kycRecords.filter((k) => k.client_id === id)
  const latestKyc = clientKyc.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  const clientAlerts = alerts.filter((a) => a.client_id === id)

  if (!client) {
    return (
      <div className="page">
        <p>Cliente no encontrado. <Link to="/clientes">Volver</Link></p>
      </div>
    )
  }

  const risk = client.matrix_risk_level ?? client.risk_level
  const compliance = getClientCompliance(client, clientKyc, expedientes, alerts, operations, notices, officers, manuals, trainings)

  function refreshOps() {
    refetchOps()
    refetchNotices()
  }

  return (
    <div className="page">
      <Link to="/clientes" className="back-link">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <header className="page-header">
        <div>
          <h1>{client.name}</h1>
          <p>
            {client.client_type === 'persona_fisica' ? 'Persona física' : 'Persona moral'}
            {client.rfc && ` · RFC: ${client.rfc}`}
            {client.curp && ` · CURP: ${client.curp}`}
          </p>
        </div>
        <div className="header-actions">
          <Badge variant={risk === 'bajo' ? 'success' : risk === 'medio' ? 'warning' : 'danger'}>
            Riesgo {RISK_LABELS[risk]}
          </Badge>
          {client.vulnerable_activity && <Badge variant="danger">Act. vulnerable</Badge>}
          <Button variant="secondary" onClick={() => setEmailOpen(true)}>
            <Mail size={16} /> Correo
          </Button>
          <Button variant="secondary" onClick={async () => {
            const r = await createClientPortalToken(client.id, 'Documentos KYC', 7, user?.id)
            if (r.error) setActionInfo(r.error)
            else if (r.url) {
              await navigator.clipboard.writeText(r.url)
              setActionInfo('Enlace portal copiado (válido 7 días). Envíalo al cliente.')
            }
          }}>
            <Link2 size={16} /> Portal cliente
          </Button>
          {canExport && (
            <Button variant="secondary" disabled={exporting} onClick={async () => {
              setExporting(true)
              setActionInfo('')
              const result = await runSensitiveAction({
                actionType: 'export_client_bundle',
                title: `Exportar expediente PLD: ${client.name}`,
                clientId: client.id,
                payload: { clientId: client.id },
                direct: () => exportClientBundleZip(client.id),
              })
              setExporting(false)
              if (result.pending) setActionInfo('Exportación solicitada — pendiente de autorización.')
              else if (result.error) setActionInfo(result.error)
            }}>
              <Download size={16} /> Exportar expediente
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={16} /> Editar
          </Button>
          {canDelete && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} /> Eliminar
            </Button>
          )}
        </div>
      </header>

      <ComplianceBadge summary={compliance} />
      {actionInfo && <p className="form-success compliance-banner">{actionInfo}</p>}

      <div className="detail-grid">
        <section className="card">
          <h2>Datos PLD / contacto</h2>
          <dl className="detail-list">
            <dt>Email</dt><dd>{client.email ?? '—'}</dd>
            <dt>Teléfono</dt><dd>{client.phone ?? '—'}</dd>
            <dt>Giro</dt><dd>{client.industry ?? '—'}</dd>
            <dt>Nacionalidad</dt><dd>{client.nationality ?? '—'}</dd>
            <dt>Representante legal</dt><dd>{client.legal_representative ?? '—'}</dd>
            <dt>Dirección</dt><dd>{client.address ?? '—'}</dd>
            <dt>Actividad vulnerable</dt><dd>{client.vulnerable_activity ? 'Sí' : 'No'}</dd>
            <dt>Registrado</dt><dd>{formatDate(client.created_at)}</dd>
          </dl>
        </section>

        <section className="card card-wide">
          <h2>Matriz de riesgo</h2>
          <RiskMatrixPanel client={client} onUpdated={() => { refetch(); refetchKyc() }} />
        </section>

        <ClientCompliancePanel
          clientId={client.id}
          officers={officers}
          manuals={manuals}
          trainings={trainings}
          role={profile?.role}
        />

        <section className="card">
          <h2>Operaciones y avisos PLD</h2>
          <ClientOperationsPanel
            clientId={client.id}
            operations={operations}
            notices={notices}
            onRefresh={refreshOps}
          />
        </section>

        <section className="card">
          <h2>Expedientes ({clientExpedientes.length})</h2>
          {clientExpedientes.length === 0 ? (
            <p className="empty-state">Sin expedientes</p>
          ) : (
            <div className="mini-list">
              {clientExpedientes.map((exp) => (
                <Link key={exp.id} to={`/expedientes/${exp.id}`} className="mini-list-item">
                  <strong>{exp.title}</strong>
                  <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>KYC ({clientKyc.length})</h2>
          {clientKyc.length === 0 ? (
            <p className="empty-state">Sin registros KYC</p>
          ) : (
            <div className="mini-list">
              {clientKyc.map((kyc) => (
                <Link key={kyc.id} to={`/kyc?kyc=${kyc.id}`} className="mini-list-item">
                  <strong>{kyc.checklist_completion ?? kyc.risk_score}% docs</strong>
                  <Badge variant={kyc.status === 'aprobado' ? 'success' : 'warning'}>{kyc.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <SanctionsPanel client={client} kyc={latestKyc ?? null} onUpdated={refetchKyc} />
        </section>

        <section className="card card-wide">
          <h2>Línea de tiempo 360°</h2>
          <ClientTimeline
            expedientes={clientExpedientes}
            kycList={clientKyc}
            activity={activity}
            alerts={clientAlerts}
            operations={operations.filter((o) => o.client_id === client.id)}
            notices={notices.filter((n) => n.client_id === client.id)}
          />
        </section>

        <section className="card full-width">
          <h2>Documentos del cliente</h2>
          <DocumentsPanel clientId={client.id} kycId={latestKyc?.id} />
        </section>
      </div>

      <EditClientModal client={editing ? client : null} onClose={() => setEditing(false)} onUpdated={refetch} />
      <ClientEmailTemplatesModal open={emailOpen} onClose={() => setEmailOpen(false)} client={client} />
      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cliente"
        message={requiresApproval('delete_client')
          ? `¿Solicitar autorización para eliminar "${client.name}" y todos sus expedientes, KYC y documentos?`
          : `¿Eliminar "${client.name}" y todos sus expedientes, KYC y documentos?`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true)
          const result = await runSensitiveAction({
            actionType: 'delete_client',
            title: `Eliminar cliente: ${client.name}`,
            clientId: client.id,
            payload: { clientId: client.id },
            direct: () => deleteClient(client.id, user?.id),
          })
          setDeleting(false)
          if (result.pending) {
            setDeleteOpen(false)
            setActionInfo('Eliminación solicitada — pendiente de autorización.')
          } else if (!result.error) navigate('/clientes')
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
