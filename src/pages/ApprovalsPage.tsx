import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useApprovalRequests } from '../hooks/useApprovalRequests'
import { useClients, useProfiles } from '../hooks/useData'
import { reviewApprovalRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { canReviewApprovals } from '../lib/permissions'
import {
  APPROVAL_ACTION_LABELS,
  APPROVAL_STATUS_LABELS,
  type ApprovalRequest,
} from '../lib/types'
import { formatDate, formatRelative } from '../lib/utils'
import { useState } from 'react'

export function ApprovalsPage() {
  const { user, profile } = useAuth()
  const { clients } = useClients()
  const { profiles } = useProfiles()
  const { requests, pending, loading, refetch } = useApprovalRequests()
  const [filter, setFilter] = useState<'pendiente' | 'all'>('pendiente')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const canReview = canReviewApprovals(profile?.role)
  const shown = filter === 'pendiente' ? pending : requests

  function requesterName(req: ApprovalRequest) {
    return req.requester?.full_name
      ?? profiles.find((p) => p.id === req.requested_by)?.full_name
      ?? 'Equipo'
  }

  function clientName(req: ApprovalRequest) {
    return req.clients?.name ?? clients.find((c) => c.id === req.client_id)?.name
  }

  async function handleReview(req: ApprovalRequest, decision: 'aprobada' | 'rechazada') {
    if (!canReview) return
    const notes = decision === 'rechazada'
      ? window.prompt('Motivo del rechazo (opcional):') ?? undefined
      : undefined
    setBusyId(req.id)
    setMessage('')
    const result = await reviewApprovalRequest(req.id, decision, notes, user?.id)
    setBusyId(null)
    if (result.error) setMessage(result.error)
    else {
      setMessage(decision === 'aprobada' ? 'Solicitud aprobada y ejecutada.' : 'Solicitud rechazada.')
      refetch()
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Autorizaciones</h1>
          <p>
            {canReview
              ? 'Revisa solicitudes de tu auxiliar antes de ejecutar acciones sensibles'
              : 'Tus solicitudes pendientes de revisión por un abogado'}
          </p>
        </div>
        <div className="header-actions">
          <Button variant={filter === 'pendiente' ? 'primary' : 'secondary'} onClick={() => setFilter('pendiente')}>
            Pendientes ({pending.length})
          </Button>
          <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
            Historial
          </Button>
        </div>
      </header>

      {message && <p className="form-success compliance-banner">{message}</p>}

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : shown.length === 0 ? (
        <div className="empty-card">
          <h2>Sin solicitudes {filter === 'pendiente' ? 'pendientes' : ''}</h2>
          <p className="card-desc">
            {canReview
              ? 'Cuando tu auxiliar pida eliminar un documento o aprobar un KYC, aparecerá aquí.'
              : 'Las acciones sensibles que solicites quedarán en espera hasta que un abogado las autorice.'}
          </p>
        </div>
      ) : (
        <div className="approval-list">
          {shown.map((req) => (
            <article key={req.id} className="approval-card card">
              <div className="approval-card-head">
                <div>
                  <strong>{req.title}</strong>
                  <span className="cell-sub">
                    {APPROVAL_ACTION_LABELS[req.action_type]} · {formatRelative(req.created_at)}
                  </span>
                </div>
                <Badge variant={req.status === 'pendiente' ? 'warning' : req.status === 'aprobada' ? 'success' : 'danger'}>
                  {APPROVAL_STATUS_LABELS[req.status]}
                </Badge>
              </div>
              {req.description && <p>{req.description}</p>}
              {clientName(req) && (
                <Link to={`/clientes/${req.client_id}`} className="cell-sub">Cliente: {clientName(req)}</Link>
              )}
              {req.requested_by && (
                <span className="cell-sub">Solicitó: {requesterName(req)}</span>
              )}
              {req.reviewed_at && (
                <span className="cell-sub">Revisado {formatDate(req.reviewed_at)}</span>
              )}
              {req.status === 'pendiente' && canReview && (
                <div className="approval-card-actions">
                  <Button size="sm" disabled={busyId === req.id} onClick={() => handleReview(req, 'aprobada')}>
                    <Check size={14} /> Aprobar y ejecutar
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busyId === req.id} onClick={() => handleReview(req, 'rechazada')}>
                    <X size={14} /> Rechazar
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
