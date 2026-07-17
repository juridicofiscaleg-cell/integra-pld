import { APPROVAL_ACTION_LABELS, type ApprovalRequest } from '../../lib/types'

function formatPayloadValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.length} elementos]`
  return JSON.stringify(value, null, 2)
}

export function ApprovalPayloadDiff({ req }: { req: ApprovalRequest }) {
  const payload = req.payload ?? {}
  const keys = Object.keys(payload).filter((k) => !['pendingStoragePath', 'fileSize'].includes(k))

  if (keys.length === 0) {
    return <p className="cell-sub">Sin detalle adicional en la solicitud.</p>
  }

  return (
    <div className="approval-payload">
      <strong>Detalle de la solicitud</strong>
      <dl className="detail-list compact-perms">
        <dt>Acción</dt>
        <dd>{APPROVAL_ACTION_LABELS[req.action_type]}</dd>
        {keys.map((key) => (
          <div key={key} className="payload-row">
            <dt>{key}</dt>
            <dd>
              <pre className="payload-pre">{formatPayloadValue(payload[key])}</pre>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
