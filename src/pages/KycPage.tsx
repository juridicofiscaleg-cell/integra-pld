import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Shield } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NewKycModal } from '../components/kyc/NewKycModal'
import { EditKycModal } from '../components/kyc/EditKycModal'
import { useClients, useExpedientes, useKycRecords } from '../hooks/useData'
import { KYC_CHECKLIST_ITEMS, KYC_STATUS_LABELS, type KycChecklist, type KycRecord } from '../lib/types'
import { formatDate } from '../lib/utils'

const statusVariant = {
  pendiente: 'warning' as const,
  en_revision: 'info' as const,
  aprobado: 'success' as const,
  rechazado: 'danger' as const,
  vencido: 'danger' as const,
}

function checklistProgress(checklist: KycChecklist): number {
  const total = KYC_CHECKLIST_ITEMS.length
  const done = KYC_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
  return Math.round((done / total) * 100)
}

export function KycPage() {
  const { records, loading, refetch } = useKycRecords()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KycRecord | null>(null)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>KYC / Debida Diligencia</h1>
          <p>Verificación y cumplimiento de clientes</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo KYC
        </Button>
      </header>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : records.length === 0 ? (
        <div className="empty-card">
          <h2>Sin registros KYC</h2>
          <p>Crea un KYC para iniciar la debida diligencia de un cliente.</p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nuevo KYC
          </Button>
        </div>
      ) : (
        <div className="kyc-cards">
          {records.map((kyc) => {
            const progress = checklistProgress(kyc.checklist)
            return (
              <div key={kyc.id} className="kyc-card">
                <div className="kyc-card-header">
                  <Shield size={20} />
                  <div>
                    <Link to={`/clientes/${kyc.client_id}`}>
                      <strong>{kyc.clients?.name}</strong>
                    </Link>
                    <span>Creado {formatDate(kyc.created_at)}</span>
                  </div>
                  <div className="kyc-card-actions">
                    <Badge variant={statusVariant[kyc.status]}>
                      {KYC_STATUS_LABELS[kyc.status]}
                    </Badge>
                    <button type="button" className="icon-btn" onClick={() => setEditing(kyc)} title="Editar">
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                <div className="kyc-score">
                  <span className="score-label">Score de riesgo</span>
                  <div className="score-bar">
                    <div
                      className={`score-fill ${kyc.risk_score > 60 ? 'high' : kyc.risk_score > 30 ? 'medium' : 'low'}`}
                      style={{ width: `${kyc.risk_score}%` }}
                    />
                  </div>
                  <span className="score-value">{kyc.risk_score}/100</span>
                </div>

                <div className="kyc-checklist">
                  <span className="checklist-header">Documentación ({progress}%)</span>
                  <div className="checklist-grid">
                    {KYC_CHECKLIST_ITEMS.map((item) => (
                      <div
                        key={item.key}
                        className={`checklist-item ${kyc.checklist[item.key] ? 'done' : 'pending'}`}
                      >
                        {kyc.checklist[item.key] ? '✓' : '○'} {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kyc-flags">
                  {kyc.pep && <Badge variant="danger">PEP</Badge>}
                  {kyc.sanctions_check && <Badge variant="success">Listas OK</Badge>}
                  {kyc.sanctions_results && Object.values(kyc.sanctions_results).some((r) => r.match) && (
                    <Badge variant="danger">Coincidencia en listas</Badge>
                  )}
                  {kyc.expires_at && (
                    <span className={`kyc-expiry ${kyc.status === 'vencido' ? 'overdue-text' : ''}`}>
                      Vence: {formatDate(kyc.expires_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewKycModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clients={clients}
        expedientes={expedientes}
        onCreated={refetch}
      />

      <EditKycModal
        kyc={editing}
        onClose={() => setEditing(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
