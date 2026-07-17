import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { createPldOperation, createUnusualNotice, deletePldOperation, deleteUnusualNotice } from '../lib/api'
import { useProtectedAction } from '../hooks/useProtectedAction'
import { canDelete as roleCanDelete, canWrite, needsApprovalForSensitive } from '../lib/permissions'
import {
  useClients,
  useExpedientes,
  usePldOperations,
  useProfiles,
  useUnusualNotices,
} from '../hooks/useData'
import {
  NOTICE_STATUS_LABELS,
  NOTICE_TYPE_LABELS,
  OPERATION_TYPES,
  type NoticeType,
} from '../lib/types'
import { classifyOperation, getThresholdForActivity } from '../lib/sat-thresholds'
import { EditNoticeModal } from '../components/operations/EditNoticeModal'
import { EditOperationModal } from '../components/operations/EditOperationModal'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/utils'

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const prefilledClient = searchParams.get('cliente') ?? ''
  const { user, profile } = useAuth()
  const { runSensitiveAction } = useProtectedAction()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { profiles } = useProfiles()
  const { operations, loading: opsLoading, refetch: refetchOps } = usePldOperations()
  const { notices, loading: noticesLoading, refetch: refetchNotices } = useUnusualNotices()
  const [tab, setTab] = useState<'operaciones' | 'avisos'>('operaciones')
  const [search, setSearch] = useState('')
  const [filterUnusual, setFilterUnusual] = useState('all')
  const [filterNoticeType, setFilterNoticeType] = useState('all')
  const [filterNoticeStatus, setFilterNoticeStatus] = useState('all')
  const [opModal, setOpModal] = useState(false)
  const [noticeModal, setNoticeModal] = useState(false)
  const [deleteOpId, setDeleteOpId] = useState<string | null>(null)
  const [editOp, setEditOp] = useState<(typeof operations)[0] | null>(null)
  const [editNotice, setEditNotice] = useState<(typeof notices)[0] | null>(null)
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null)
  const [initialClientId, setInitialClientId] = useState('')

  const mayDelete = roleCanDelete(profile?.role) || needsApprovalForSensitive(profile?.role)
  const canEdit = canWrite(profile?.role)

  useEffect(() => {
    if (prefilledClient) {
      setInitialClientId(prefilledClient)
      setOpModal(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('cliente')
        return next
      }, { replace: true })
    }
  }, [prefilledClient, setSearchParams])

  const filteredOps = operations.filter((o) => {
    const name = o.clients?.name?.toLowerCase() ?? ''
    if (search && !name.includes(search.toLowerCase()) && !o.operation_type.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (filterUnusual === 'unusual' && !o.unusual) return false
    if (filterUnusual === 'normal' && o.unusual) return false
    return true
  })

  const filteredNotices = notices.filter((n) => {
    const name = n.clients?.name?.toLowerCase() ?? ''
    if (search && !name.includes(search.toLowerCase()) && !n.title.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (filterNoticeType !== 'all' && n.notice_type !== filterNoticeType) return false
    if (filterNoticeStatus !== 'all' && n.status !== filterNoticeStatus) return false
    return true
  })

  const h24Urgent = notices.filter((n) => n.notice_type === '24h' && n.status === 'borrador')

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Operaciones PLD</h1>
          <p>Registro de operaciones y avisos inusuales / relevantes (Art. 21 LFPIORPI)</p>
        </div>
        <div className="header-actions">
          {canEdit && (
            <>
              <Button variant="secondary" onClick={() => setNoticeModal(true)}>
                <Plus size={16} /> Nuevo aviso
              </Button>
              <Button onClick={() => setOpModal(true)}>
                <Plus size={16} /> Registrar operación
              </Button>
            </>
          )}
        </div>
      </header>

      {h24Urgent.length > 0 && (
        <div className="form-error compliance-banner">
          <strong>{h24Urgent.length} aviso(s) 24h en borrador</strong>
          <p>Revisa el plazo de presentación conforme al Art. 21 LFPIORPI.</p>
        </div>
      )}

      <div className="tab-row">
        <button type="button" className={`tab ${tab === 'operaciones' ? 'active' : ''}`} onClick={() => setTab('operaciones')}>
          Operaciones ({operations.length})
        </button>
        <button type="button" className={`tab ${tab === 'avisos' ? 'active' : ''}`} onClick={() => setTab('avisos')}>
          Avisos ({notices.length})
        </button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar cliente o tipo..."
        filters={
          tab === 'operaciones'
            ? [{
                label: 'Tipo',
                value: filterUnusual,
                onChange: setFilterUnusual,
                options: [
                  { value: 'all', label: 'Todas' },
                  { value: 'unusual', label: 'Inusuales' },
                  { value: 'normal', label: 'Normales' },
                ],
              }]
            : [
                {
                  label: 'Tipo aviso',
                  value: filterNoticeType,
                  onChange: setFilterNoticeType,
                  options: [
                    { value: 'all', label: 'Todos' },
                    ...Object.entries(NOTICE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
                  ],
                },
                {
                  label: 'Estado',
                  value: filterNoticeStatus,
                  onChange: setFilterNoticeStatus,
                  options: [
                    { value: 'all', label: 'Todos' },
                    ...Object.entries(NOTICE_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
                  ],
                },
              ]
        }
      />

      {tab === 'operaciones' ? (
        opsLoading ? (
          <p className="loading">Cargando...</p>
        ) : filteredOps.length === 0 ? (
          <div className="empty-card"><p>Sin operaciones registradas</p></div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Inusual</th>
                  <th>Reportada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOps.map((op) => (
                  <tr key={op.id}>
                    <td>{formatDate(op.operation_date)}</td>
                    <td><Link to={`/clientes/${op.client_id}`}>{op.clients?.name}</Link></td>
                    <td>{op.operation_type}</td>
                    <td>{op.amount ? `${op.amount.toLocaleString('es-MX')} ${op.currency}` : '—'}</td>
                    <td>{op.unusual ? <Badge variant="danger">Sí</Badge> : '—'}</td>
                    <td>{op.reported ? <Badge variant="success">Sí</Badge> : '—'}</td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => setEditOp(op)} title="Editar"><Pencil size={14} /></button>
                      {mayDelete && (
                        <button type="button" className="icon-btn danger" onClick={() => setDeleteOpId(op.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : noticesLoading ? (
        <p className="loading">Cargando...</p>
      ) : filteredNotices.length === 0 ? (
        <div className="empty-card"><p>Sin avisos registrados</p></div>
      ) : (
        <div className="alert-cards">
          {filteredNotices.map((n) => (
            <div key={n.id} className="alert-card">
              <div className="alert-card-body">
                <div className="alert-card-top">
                  <strong>{n.title}</strong>
                  <Badge variant="warning">{NOTICE_TYPE_LABELS[n.notice_type]}</Badge>
                  <Badge variant={n.status === 'presentado' ? 'success' : 'info'}>{NOTICE_STATUS_LABELS[n.status]}</Badge>
                </div>
                {n.narrative && <p>{n.narrative}</p>}
                <Link to={`/clientes/${n.client_id}`}>{n.clients?.name}</Link>
                <span> · Detectado {formatDate(n.detected_at)}</span>
                {n.operation_id && (
                  <span> · <Link to="/operaciones">Vinculada a operación</Link></span>
                )}
              </div>
              <div className="row-actions">
                {canEdit && (
                  <Button variant="secondary" onClick={() => setEditNotice(n)}><Pencil size={14} /> Editar</Button>
                )}
                {mayDelete && (
                  <Button variant="danger" onClick={() => setDeleteNoticeId(n.id)}><Trash2 size={14} /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <OperationModal
        open={opModal}
        clients={clients}
        expedientes={expedientes}
        initialClientId={initialClientId}
        onClose={() => { setOpModal(false); setInitialClientId('') }}
        onCreated={() => { setOpModal(false); refetchOps(); refetchNotices() }}
        userId={user?.id}
        refetchNotices={refetchNotices}
      />

      <NoticeModal
        open={noticeModal}
        clients={clients}
        profiles={profiles}
        onClose={() => setNoticeModal(false)}
        onCreated={() => { setNoticeModal(false); refetchNotices() }}
        userId={user?.id}
      />

      <ConfirmDialog
        open={!!deleteOpId}
        title="Eliminar operación"
        message="¿Eliminar este registro de operación?"
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (!deleteOpId) return
          const op = operations.find((o) => o.id === deleteOpId)
          await runSensitiveAction({
            actionType: 'delete_operation',
            title: `Eliminar operación: ${op?.operation_type ?? deleteOpId}`,
            clientId: op?.client_id,
            payload: { operationId: deleteOpId },
            direct: () => deletePldOperation(deleteOpId),
          })
          setDeleteOpId(null)
          refetchOps()
        }}
        onCancel={() => setDeleteOpId(null)}
      />

      <EditOperationModal operation={editOp} onClose={() => setEditOp(null)} onUpdated={() => { setEditOp(null); refetchOps() }} />
      <EditNoticeModal notice={editNotice} onClose={() => setEditNotice(null)} onUpdated={() => { setEditNotice(null); refetchNotices() }} />

      <ConfirmDialog
        open={!!deleteNoticeId}
        title="Eliminar aviso"
        message="¿Eliminar este aviso PLD?"
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (!deleteNoticeId) return
          const n = notices.find((x) => x.id === deleteNoticeId)
          await runSensitiveAction({
            actionType: 'delete_notice',
            title: `Eliminar aviso: ${n?.title ?? deleteNoticeId}`,
            clientId: n?.client_id,
            payload: { noticeId: deleteNoticeId },
            direct: () => deleteUnusualNotice(deleteNoticeId),
          })
          setDeleteNoticeId(null)
          refetchNotices()
        }}
        onCancel={() => setDeleteNoticeId(null)}
      />
    </div>
  )
}

function OperationModal({
  open,
  clients,
  expedientes,
  initialClientId,
  onClose,
  onCreated,
  userId,
  refetchNotices,
}: {
  open: boolean
  clients: ReturnType<typeof useClients>['clients']
  expedientes: ReturnType<typeof useExpedientes>['expedientes']
  initialClientId?: string
  onClose: () => void
  onCreated: () => void
  userId?: string
  refetchNotices?: () => void
}) {
  const [clientId, setClientId] = useState('')
  const [expedienteId, setExpedienteId] = useState('')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().slice(0, 10))
  const [operationType, setOperationType] = useState<string>(OPERATION_TYPES[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [unusual, setUnusual] = useState(false)
  const [autoNotice, setAutoNotice] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && initialClientId) setClientId(initialClientId)
  }, [open, initialClientId])

  const selectedClient = clients.find((c) => c.id === clientId)
  const thresholdHint = selectedClient ? getThresholdForActivity(selectedClient.industry, selectedClient.activity_code) : null
  const classification = classifyOperation(
    amount ? Number(amount) : undefined,
    selectedClient?.industry,
    selectedClient?.activity_code,
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setSaving(true)
    const amt = amount ? Number(amount) : undefined
    const shouldUnusual = unusual || !!classification.noticeType
    const result = await createPldOperation({
      client_id: clientId,
      expediente_id: expedienteId || undefined,
      operation_date: operationDate,
      operation_type: operationType,
      amount: amt,
      description,
      unusual: shouldUnusual,
      auto_create_notice: shouldUnusual && autoNotice,
      notice_type: classification.noticeType ?? 'inusual',
      client_industry: selectedClient?.industry,
    }, userId)
    setSaving(false)
    if (result.error) setError(result.error)
    else {
      if (result.noticeId) refetchNotices?.()
      onCreated()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar operación">
      <form onSubmit={submit} className="form-stack">
        <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="">Seleccionar...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Expediente (opc.)" value={expedienteId} onChange={(e) => setExpedienteId(e.target.value)}>
          <option value="">—</option>
          {expedientes.filter((e) => e.client_id === clientId).map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </Select>
        <Input label="Fecha" type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} required />
        <Select label="Tipo" value={operationType} onChange={(e) => setOperationType(e.target.value)}>
          {OPERATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Monto (MXN)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {thresholdHint && (
          <p className="card-desc">
            Umbrales orientativos ({thresholdHint.activity}): inusual ${thresholdHint.unusualAmount.toLocaleString('es-MX')} · relevante ${thresholdHint.relevantAmount.toLocaleString('es-MX')}
          </p>
        )}
        {amount && <p className={`form-success ${classification.noticeType ? '' : 'muted'}`}>{classification.label}</p>}
        <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="checkbox-row">
          <input type="checkbox" checked={unusual} onChange={(e) => setUnusual(e.target.checked)} />
          Marcar como operación inusual
        </label>
        {(unusual || classification.noticeType) && (
          <label className="checkbox-row">
            <input type="checkbox" checked={autoNotice} onChange={(e) => setAutoNotice(e.target.checked)} />
            Crear aviso PLD automáticamente (Art. 21)
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function NoticeModal({
  open,
  clients,
  profiles,
  onClose,
  onCreated,
  userId,
}: {
  open: boolean
  clients: ReturnType<typeof useClients>['clients']
  profiles: ReturnType<typeof useProfiles>['profiles']
  onClose: () => void
  onCreated: () => void
  userId?: string
}) {
  const [clientId, setClientId] = useState('')
  const [noticeType, setNoticeType] = useState<NoticeType>('inusual')
  const [title, setTitle] = useState('')
  const [narrative, setNarrative] = useState('')
  const [amount, setAmount] = useState('')
  const [detectedAt, setDetectedAt] = useState(new Date().toISOString().slice(0, 10))
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !title) return
    setSaving(true)
    const result = await createUnusualNotice({
      client_id: clientId,
      notice_type: noticeType,
      title,
      narrative,
      amount: amount ? Number(amount) : undefined,
      detected_at: detectedAt,
      assigned_to: assignedTo || undefined,
    }, userId)
    setSaving(false)
    if (result.error) setError(result.error)
    else onCreated()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo aviso PLD">
      <form onSubmit={submit} className="form-stack">
        <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="">Seleccionar...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Tipo de aviso" value={noticeType} onChange={(e) => setNoticeType(e.target.value as NoticeType)}>
          {Object.entries(NOTICE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Narrativa / hechos" value={narrative} onChange={(e) => setNarrative(e.target.value)} />
        <Input label="Monto involucrado" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Fecha detección" type="date" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} />
        <Select label="Responsable" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Sin asignar</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </Select>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear aviso'}</Button>
        </div>
      </form>
    </Modal>
  )
}
