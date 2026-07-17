import { Link } from 'react-router-dom'
import type { ActivityLog, Alert, Expediente, KycRecord } from '../../lib/types'
import { formatDateTime, formatRelative } from '../../lib/utils'
import { MATTER_TYPE_LABELS, KYC_STATUS_LABELS } from '../../lib/types'

interface ClientTimelineProps {
  expedientes: Expediente[]
  kycList: KycRecord[]
  activity: ActivityLog[]
  alerts: Alert[]
}

export function ClientTimeline({ expedientes, kycList, activity, alerts }: ClientTimelineProps) {
  type Event = { id: string; date: string; label: string; detail?: string; link?: string }

  const events: Event[] = []

  for (const exp of expedientes) {
    events.push({
      id: `exp-${exp.id}`,
      date: exp.opened_at,
      label: `Expediente: ${exp.title}`,
      detail: MATTER_TYPE_LABELS[exp.matter_type],
      link: `/expedientes/${exp.id}`,
    })
  }
  for (const kyc of kycList) {
    events.push({
      id: `kyc-${kyc.id}`,
      date: kyc.created_at,
      label: `KYC ${KYC_STATUS_LABELS[kyc.status]}`,
      detail: kyc.renewal_of ? 'Renovación' : 'Debida diligencia',
      link: '/kyc',
    })
  }
  for (const a of activity) {
    events.push({
      id: `act-${a.id}`,
      date: a.created_at,
      label: a.description,
      detail: a.profiles?.full_name,
    })
  }
  for (const al of alerts.filter((x) => !x.resolved)) {
    events.push({
      id: `alert-${al.id}`,
      date: al.created_at,
      label: al.title,
      detail: al.due_date ? `Vence ${formatDateTime(al.due_date)}` : 'Pendiente',
      link: '/alertas',
    })
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (events.length === 0) {
    return <p className="empty-state">Sin actividad registrada</p>
  }

  return (
    <div className="client-timeline">
      {events.slice(0, 25).map((ev) => (
        <div key={ev.id} className="client-timeline-item">
          <div className="activity-dot" />
          <div>
            {ev.link ? (
              <Link to={ev.link}><strong>{ev.label}</strong></Link>
            ) : (
              <strong>{ev.label}</strong>
            )}
            {ev.detail && <span className="timeline-detail">{ev.detail}</span>}
            <small>{formatRelative(ev.date)}</small>
          </div>
        </div>
      ))}
    </div>
  )
}
