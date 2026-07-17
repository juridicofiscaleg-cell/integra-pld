import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAlerts, useClients, useExpedientes, useKycRecords, useTrainingSessions, useUnusualNotices } from '../hooks/useData'
import { formatDate, isOverdue } from '../lib/utils'
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarEvent {
  id: string
  date: string
  title: string
  type: 'kyc' | 'alerta' | 'expediente' | 'capacitacion' | 'aviso24h'
  link?: string
  urgent?: boolean
}

export function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const { records: kycRecords } = useKycRecords()
  const { alerts } = useAlerts()
  const { expedientes } = useExpedientes()
  const { sessions: trainings } = useTrainingSessions()
  const { notices } = useUnusualNotices()
  const { clients } = useClients()

  const events = useMemo(() => {
    const list: CalendarEvent[] = []
    for (const k of kycRecords) {
      if (k.expires_at) {
        list.push({
          id: `kyc-${k.id}`,
          date: k.expires_at.slice(0, 10),
          title: `KYC vence: ${k.clients?.name ?? 'Cliente'}`,
          type: 'kyc',
          link: `/clientes/${k.client_id}`,
          urgent: k.status === 'vencido',
        })
      }
    }
    for (const a of alerts) {
      if (a.due_date) {
        list.push({
          id: `alert-${a.id}`,
          date: a.due_date,
          title: a.title,
          type: 'alerta',
          link: a.client_id ? `/clientes/${a.client_id}` : '/alertas',
          urgent: isOverdue(a.due_date),
        })
      }
    }
    for (const e of expedientes.filter((x) => x.status === 'activo')) {
      list.push({
        id: `exp-${e.id}`,
        date: e.updated_at.slice(0, 10),
        title: `Exp. activo: ${e.title}`,
        type: 'expediente',
        link: `/expedientes/${e.id}`,
      })
    }
    for (const t of trainings) {
      list.push({
        id: `train-${t.id}`,
        date: t.session_date,
        title: `Capacitación: ${t.title}`,
        type: 'capacitacion',
        link: t.client_id ? `/cumplimiento?capacitacion=${t.id}` : '/cumplimiento',
      })
      const nextAnnual = addYears(parseISO(t.session_date), 1)
      list.push({
        id: `train-renew-${t.id}`,
        date: format(nextAnnual, 'yyyy-MM-dd'),
        title: `Renovar capacitación: ${t.clients?.name ?? t.title}`,
        type: 'capacitacion',
        link: t.client_id ? `/cumplimiento?cliente=${t.client_id}&accion=capacitacion` : '/cumplimiento',
        urgent: nextAnnual <= new Date(),
      })
    }
    for (const n of notices.filter((x) => x.notice_type === '24h' && x.status === 'borrador')) {
      list.push({
        id: `notice24-${n.id}`,
        date: n.detected_at.slice(0, 10),
        title: `Aviso 24h: ${n.title}`,
        type: 'aviso24h',
        link: '/operaciones',
        urgent: true,
      })
    }
    for (const c of clients.filter((x) => x.vulnerable_activity)) {
      const lastTraining = trainings
        .filter((t) => t.client_id === c.id)
        .sort((a, b) => b.session_date.localeCompare(a.session_date))[0]
      const dueDate = lastTraining
        ? format(addYears(parseISO(lastTraining.session_date), 1), 'yyyy-MM-dd')
        : format(subMonths(new Date(), 11), 'yyyy-MM-dd')
      if (!lastTraining || parseISO(dueDate) <= addMonths(new Date(), 1)) {
        list.push({
          id: `train-due-${c.id}`,
          date: dueDate,
          title: `Capacitación anual: ${c.name}`,
          type: 'capacitacion',
          link: `/cumplimiento?cliente=${c.id}&accion=capacitacion`,
          urgent: parseISO(dueDate) < new Date(),
        })
      }
    }
    return list
  }, [kycRecords, alerts, expedientes, trainings, notices, clients])

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const selectedDayEvents = events.filter((e) => isSameDay(parseISO(e.date), current))

  const typeLabel: Record<CalendarEvent['type'], string> = {
    kyc: 'KYC',
    alerta: 'Alerta',
    expediente: 'Expediente',
    capacitacion: 'Capacitación',
    aviso24h: 'Aviso 24h',
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Calendario de vencimientos</h1>
          <p>KYC, alertas, capacitaciones PLD y plazos Art. 21</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => setCurrent(addMonths(current, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <strong className="calendar-month">
            {format(current, 'MMMM yyyy', { locale: es })}
          </strong>
          <Button variant="secondary" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </header>

      <div className="calendar-grid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day))
          const inMonth = isSameMonth(day, current)
          const isSelected = isSameDay(day, current)
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`calendar-day ${inMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''} ${dayEvents.some((e) => e.urgent) ? 'has-urgent' : ''}`}
              onClick={() => setCurrent(day)}
            >
              <span>{format(day, 'd')}</span>
              {dayEvents.length > 0 && <span className="calendar-dot">{dayEvents.length}</span>}
            </button>
          )
        })}
      </div>

      <section className="card">
        <h2>Eventos — {format(current, "d 'de' MMMM", { locale: es })}</h2>
        {selectedDayEvents.length === 0 ? (
          <p className="empty-state">Sin eventos este día</p>
        ) : (
          <div className="mini-list">
            {selectedDayEvents.map((ev) => (
              <div key={ev.id} className="mini-list-item">
                {ev.link ? (
                  <Link to={ev.link}><strong>{ev.title}</strong></Link>
                ) : (
                  <strong>{ev.title}</strong>
                )}
                <Badge variant={ev.urgent ? 'danger' : ev.type === 'kyc' ? 'warning' : ev.type === 'aviso24h' ? 'danger' : 'info'}>
                  {typeLabel[ev.type]}
                </Badge>
                <span>{formatDate(ev.date)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
