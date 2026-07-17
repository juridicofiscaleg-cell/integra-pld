import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAlerts, useExpedientes, useKycRecords } from '../hooks/useData'
import { formatDate, isOverdue } from '../lib/utils'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarEvent {
  id: string
  date: string
  title: string
  type: 'kyc' | 'alerta' | 'expediente'
  link?: string
  urgent?: boolean
}

export function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const { records: kycRecords } = useKycRecords()
  const { alerts } = useAlerts()
  const { expedientes } = useExpedientes()

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
    return list
  }, [kycRecords, alerts, expedientes])

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const selectedDayEvents = events.filter((e) => isSameDay(parseISO(e.date), current))

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Calendario de vencimientos</h1>
          <p>KYC, alertas y plazos del despacho</p>
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
                <Badge variant={ev.type === 'kyc' ? 'warning' : ev.type === 'alerta' ? 'danger' : 'info'}>
                  {ev.type}
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
