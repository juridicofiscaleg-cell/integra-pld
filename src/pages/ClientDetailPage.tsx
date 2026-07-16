import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileCheck, FolderOpen } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { useClients, useExpedientes, useKycRecords } from '../hooks/useData'
import { MATTER_TYPE_LABELS, RISK_LABELS } from '../lib/types'
import { formatDate } from '../lib/utils'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords } = useKycRecords()

  const client = clients.find((c) => c.id === id)
  const clientExpedientes = expedientes.filter((e) => e.client_id === id)
  const clientKyc = kycRecords.filter((k) => k.client_id === id)

  if (!client) {
    return (
      <div className="page">
        <p>Cliente no encontrado. <Link to="/clientes">Volver</Link></p>
      </div>
    )
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
          </p>
        </div>
        <Badge variant={client.risk_level === 'bajo' ? 'success' : client.risk_level === 'medio' ? 'warning' : 'danger'}>
          Riesgo {RISK_LABELS[client.risk_level]}
        </Badge>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2>Información de contacto</h2>
          <dl className="detail-list">
            <dt>Email</dt><dd>{client.email ?? '—'}</dd>
            <dt>Teléfono</dt><dd>{client.phone ?? '—'}</dd>
            <dt>Industria</dt><dd>{client.industry ?? '—'}</dd>
            <dt>Dirección</dt><dd>{client.address ?? '—'}</dd>
            <dt>Registrado</dt><dd>{formatDate(client.created_at)}</dd>
          </dl>
          {client.notes && (
            <>
              <h3>Notas</h3>
              <p>{client.notes}</p>
            </>
          )}
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
                  <strong>Score: {kyc.risk_score}/100</strong>
                  <Badge variant={kyc.status === 'aprobado' ? 'success' : kyc.status === 'rechazado' ? 'danger' : 'warning'}>
                    {kyc.status}
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
