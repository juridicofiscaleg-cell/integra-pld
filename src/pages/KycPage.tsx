import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FilterBar } from '../components/ui/FilterBar'
import { deleteKycRecord } from '../lib/api'
import { useAuth } from '../context/AuthContext'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('kyc')
  const openEdit = searchParams.get('edit') === '1'
  const highlightRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useAuth()
  const { records, loading, refetch } = useKycRecords()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KycRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KycRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pepFilter, setPepFilter] = useState('')

  const canDelete = profile?.role !== 'asistente'

  const filtered = useMemo(() => {
    return records.filter((k) => {
      const name = k.clients?.name?.toLowerCase() ?? ''
      if (search && !name.includes(search.toLowerCase())) return false
      if (statusFilter && k.status !== statusFilter) return false
      if (pepFilter === 'yes' && !k.pep) return false
      if (pepFilter === 'no' && k.pep) return false
      return true
    })
  }, [records, search, statusFilter, pepFilter])

  useEffect(() => {
    if (!highlightId || loading) return
    const target = records.find((k) => k.id === highlightId)
    if (!target) return
    if (openEdit) setEditing(target)
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('kyc')
        next.delete('edit')
        return next
      }, { replace: true })
    }, openEdit ? 0 : 4000)
    return () => window.clearTimeout(timer)
  }, [highlightId, openEdit, loading, records, setSearchParams])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>KYC / Debida Diligencia</h1>
          <p>{filtered.length} registros</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo KYC
        </Button>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar cliente..."
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [{ value: '', label: 'Todos' }, ...Object.entries(KYC_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))],
          },
          {
            label: 'PEP',
            value: pepFilter,
            onChange: setPepFilter,
            options: [
              { value: '', label: 'Todos' },
              { value: 'yes', label: 'PEP' },
              { value: 'no', label: 'No PEP' },
            ],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <h2>Sin registros KYC</h2>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nuevo KYC</Button>
        </div>
      ) : (
        <div className="kyc-cards">
          {filtered.map((kyc) => {
            const progress = kyc.checklist_completion ?? checklistProgress(kyc.checklist)
            return (
              <div
                key={kyc.id}
                ref={kyc.id === highlightId ? highlightRef : undefined}
                className={`kyc-card${kyc.id === highlightId ? ' kyc-card-highlighted' : ''}`}
              >
                <div className="kyc-card-header">
                  <Shield size={20} />
                  <div>
                    <Link to={`/clientes/${kyc.client_id}`}>
                      <strong>{kyc.clients?.name}</strong>
                    </Link>
                    <span>Creado {formatDate(kyc.created_at)}</span>
                  </div>
                  <div className="kyc-card-actions">
                    <Badge variant={statusVariant[kyc.status]}>{KYC_STATUS_LABELS[kyc.status]}</Badge>
                    <button type="button" className="icon-btn" onClick={() => setEditing(kyc)} title="Editar">
                      <Pencil size={16} />
                    </button>
                    {canDelete && (
                      <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(kyc)} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="kyc-score">
                  <span className="score-label">Documentación completada</span>
                  <div className="score-bar">
                    <div className={`score-fill ${progress > 60 ? 'high' : progress > 30 ? 'medium' : 'low'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <span className="score-value">{progress}%</span>
                </div>

                <div className="kyc-flags">
                  {kyc.pep && <Badge variant="danger">PEP</Badge>}
                  {kyc.sanctions_check && <Badge variant="success">Listas OK</Badge>}
                  {kyc.sanctions_results && Object.values(kyc.sanctions_results).some((r) => r.match) && (
                    <Badge variant="danger">Coincidencia en listas</Badge>
                  )}
                  {kyc.renewal_of && <Badge variant="info">Renovación</Badge>}
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

      <NewKycModal open={modalOpen} onClose={() => setModalOpen(false)} clients={clients} expedientes={expedientes} onCreated={refetch} />
      <EditKycModal kyc={editing} onClose={() => setEditing(null)} onUpdated={refetch} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar KYC"
        message="¿Eliminar este registro de debida diligencia?"
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          await deleteKycRecord(deleteTarget.id, user?.id)
          setDeleting(false)
          setDeleteTarget(null)
          refetch()
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
