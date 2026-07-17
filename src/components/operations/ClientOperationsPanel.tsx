import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EditNoticeModal } from './EditNoticeModal'
import { EditOperationModal } from './EditOperationModal'
import { markOperationReported } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { PldOperation, UnusualNotice } from '../../lib/types'
import { NOTICE_STATUS_LABELS, NOTICE_TYPE_LABELS } from '../../lib/types'
import { formatDate } from '../../lib/utils'

interface ClientOperationsPanelProps {
  clientId: string
  operations: PldOperation[]
  notices: UnusualNotice[]
  onRefresh: () => void
}

export function ClientOperationsPanel({ clientId, operations, notices, onRefresh }: ClientOperationsPanelProps) {
  const { user } = useAuth()
  const [editOp, setEditOp] = useState<PldOperation | null>(null)
  const [editNotice, setEditNotice] = useState<UnusualNotice | null>(null)

  const clientOps = operations.filter((o) => o.client_id === clientId)
  const clientNotices = notices.filter((n) => n.client_id === clientId)

  return (
    <div className="client-ops-panel">
      <div className="client-ops-header">
        <strong>Operaciones PLD ({clientOps.length})</strong>
        <Link to={`/operaciones?cliente=${clientId}`}><Button variant="secondary"><Plus size={14} /> Registrar</Button></Link>
      </div>
      {clientOps.length === 0 ? (
        <p className="empty-state">Sin operaciones</p>
      ) : (
        <div className="mini-list">
          {clientOps.slice(0, 5).map((op) => (
            <div key={op.id} className="mini-list-item">
              <div>
                <strong>{op.operation_type}</strong>
                <span>{formatDate(op.operation_date)}</span>
                {op.amount && <span>${op.amount.toLocaleString('es-MX')}</span>}
              </div>
              <div className="row-actions">
                {op.unusual && <Badge variant="danger">Inusual</Badge>}
                {op.reported ? <Badge variant="success">Reportada</Badge> : (
                  <Button variant="secondary" onClick={async () => {
                    await markOperationReported(op.id, undefined, user?.id)
                    onRefresh()
                  }}>Marcar reportada</Button>
                )}
                <button type="button" className="icon-btn" onClick={() => setEditOp(op)}><Pencil size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="client-ops-header" style={{ marginTop: '1rem' }}>
        <strong>Avisos Art. 21 ({clientNotices.length})</strong>
      </div>
      {clientNotices.length === 0 ? (
        <p className="empty-state">Sin avisos</p>
      ) : (
        <div className="mini-list">
          {clientNotices.slice(0, 5).map((n) => (
            <div key={n.id} className="mini-list-item">
              <div>
                <strong>{n.title}</strong>
                <Badge variant="warning">{NOTICE_TYPE_LABELS[n.notice_type]}</Badge>
                <Badge variant={n.status === 'presentado' ? 'success' : 'info'}>{NOTICE_STATUS_LABELS[n.status]}</Badge>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditNotice(n)}><Pencil size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <EditOperationModal operation={editOp} onClose={() => setEditOp(null)} onUpdated={() => { setEditOp(null); onRefresh() }} />
      <EditNoticeModal notice={editNotice} onClose={() => setEditNotice(null)} onUpdated={() => { setEditNotice(null); onRefresh() }} />
    </div>
  )
}
