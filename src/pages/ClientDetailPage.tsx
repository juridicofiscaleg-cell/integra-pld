import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileCheck, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EditClientModal } from '../components/clients/EditClientModal'
import { ComplianceBadge } from '../components/clients/ComplianceBadge'
import { ClientTimeline } from '../components/clients/ClientTimeline'
import { DocumentsPanel } from '../components/documents/DocumentsPanel'
import { RiskMatrixPanel } from '../components/kyc/RiskMatrixPanel'
import { SanctionsPanel } from '../components/kyc/SanctionsPanel'
import { deleteClient } from '../lib/api'
import { getClientCompliance } from '../lib/compliance'
import { useAuth } from '../context/AuthContext'
import { useAlerts, useClientActivity, useClients, useExpedientes, useKycRecords } from '../hooks/useData'
import { MATTER_TYPE_LABELS, RISK_LABELS } from '../lib/types'
import { formatDate } from '../lib/utils'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { clients, refetch } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords, refetch: refetchKyc } = useKycRecords()
  const { alerts } = useAlerts()
  const { activity } = useClientActivity(id ?? '')
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canDelete = profile?.role !== 'asistente'
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
  const compliance = getClientCompliance(client, clientKyc, expedientes, alerts)

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
          <RiskMatrixPanel client={client} onUpdated={refetch} />
        </section>

        <section className="card">
          <h2><FolderOpen size={18} /> Expedientes ({clientExpedientes.length})</h2>
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
          <h2><FileCheck size={18} /> KYC ({clientKyc.length})</h2>
          {clientKyc.length === 0 ? (
            <p className="empty-state">Sin registros KYC</p>
          ) : (
            <div className="mini-list">
              {clientKyc.map((kyc) => (
                <Link key={kyc.id} to="/kyc" className="mini-list-item">
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
          />
        </section>

        <section className="card full-width">
          <h2>Documentos del cliente</h2>
          <DocumentsPanel clientId={client.id} />
        </section>
      </div>

      <EditClientModal client={editing ? client : null} onClose={() => setEditing(false)} onUpdated={refetch} />
      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cliente"
        message={`¿Eliminar "${client.name}" y todos sus expedientes, KYC y documentos?`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true)
          const result = await deleteClient(client.id, user?.id)
          setDeleting(false)
          if (!result.error) navigate('/clientes')
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
