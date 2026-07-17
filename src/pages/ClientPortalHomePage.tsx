import { useEffect, useState } from 'react'
import { FileCheck, FolderOpen, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DocumentsPanel } from '../components/documents/DocumentsPanel'
import { Badge } from '../components/ui/Badge'
import { fetchClientPortalSummary } from '../lib/api'
import { MATTER_TYPE_LABELS, RISK_LABELS, KYC_STATUS_LABELS } from '../lib/types'
import { formatDate } from '../lib/utils'
import type { Client, Expediente, KycRecord } from '../lib/types'

export function ClientPortalHomePage() {
  const { profile } = useAuth()
  const clientId = profile?.client_id
  const [client, setClient] = useState<Client | null>(null)
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      setError('Tu cuenta no está vinculada a un cliente. Contacta al despacho.')
      return
    }
    fetchClientPortalSummary(clientId).then((r) => {
      setLoading(false)
      if (r.error) setError(r.error)
      else {
        setClient(r.client ?? null)
        setExpedientes(r.expedientes ?? [])
        setKycRecords(r.kycRecords ?? [])
      }
    })
  }, [clientId])

  if (loading) return <div className="loading-screen">Cargando su información...</div>

  if (error || !client) {
    return (
      <div className="page">
        <div className="card">
          <h1>Acceso incompleto</h1>
          <p className="form-error">{error || 'No se encontró información del cliente.'}</p>
          <p className="cell-sub">Solicite un nuevo código de acceso a su despacho asesor.</p>
        </div>
      </div>
    )
  }

  const risk = client.matrix_risk_level ?? 'medio'

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{client.name}</h1>
          <p>
            Bienvenido al portal seguro. Aquí puede consultar el estatus de su expediente PLD
            y enviar documentación solicitada por el despacho (idealmente como oficial de cumplimiento designado).
          </p>
        </div>
        <Badge variant={risk === 'bajo' ? 'success' : risk === 'medio' ? 'warning' : 'danger'}>
          Riesgo {RISK_LABELS[risk]}
        </Badge>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2><FolderOpen size={18} /> Expedientes ({expedientes.length})</h2>
          {expedientes.length === 0 ? (
            <p className="empty-state">Aún no hay expedientes registrados a su nombre.</p>
          ) : (
            <div className="mini-list">
              {expedientes.map((exp) => (
                <div key={exp.id} className="mini-list-item">
                  <strong>{exp.title}</strong>
                  <Badge variant="info">{MATTER_TYPE_LABELS[exp.matter_type]}</Badge>
                  <span className="cell-sub">Actualizado {formatDate(exp.updated_at ?? exp.opened_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2><FileCheck size={18} /> KYC ({kycRecords.length})</h2>
          {kycRecords.length === 0 ? (
            <p className="empty-state">Sin registros KYC visibles por ahora.</p>
          ) : (
            <div className="mini-list">
              {kycRecords.map((kyc) => (
                <div key={kyc.id} className="mini-list-item">
                  <strong>Expediente KYC</strong>
                  <span>{kyc.checklist_completion ?? kyc.risk_score ?? 0}% documentación</span>
                  <Badge variant={kyc.status === 'aprobado' ? 'success' : kyc.status === 'rechazado' ? 'danger' : 'warning'}>
                    {KYC_STATUS_LABELS[kyc.status] ?? kyc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card card-wide">
          <h2><Upload size={18} /> Enviar documentos</h2>
          <p className="cell-sub">
            Suba aquí la documentación que le solicite el despacho. Los archivos quedarán asociados a su expediente PLD.
          </p>
          <DocumentsPanel clientId={client.id} />
        </section>

        <section className="card">
          <h2>Datos de contacto</h2>
          <dl className="detail-list">
            <dt>RFC</dt><dd>{client.rfc ?? '—'}</dd>
            <dt>Correo</dt><dd>{client.email ?? '—'}</dd>
            <dt>Teléfono</dt><dd>{client.phone ?? '—'}</dd>
            <dt>Representante legal</dt><dd>{client.legal_representative ?? '—'}</dd>
          </dl>
        </section>
      </div>
    </div>
  )
}
