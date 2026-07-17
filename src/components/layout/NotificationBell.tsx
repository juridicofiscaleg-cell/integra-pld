import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelative } from '../../lib/utils'

export function NotificationBell() {
  const { user } = useAuth()
  const { unread, items, markRead, markAllRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="icon-btn"
        aria-label="Notificaciones"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {unread.length > 0 && <span className="nav-badge">{unread.length}</span>}
      </button>
      {open && (
        <>
          <button type="button" className="mobile-overlay" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="notification-panel card">
            <div className="notification-panel-head">
              <strong>Notificaciones</strong>
              {unread.length > 0 && (
                <button type="button" className="link-btn" onClick={() => markAllRead()}>
                  Marcar leídas
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="cell-sub">Sin notificaciones</p>
            ) : (
              <ul className="notification-list">
                {items.slice(0, 12).map((n) => (
                  <li key={n.id} className={n.read_at ? 'read' : 'unread'}>
                    {n.link ? (
                      <Link to={n.link} onClick={() => { markRead(n.id); setOpen(false) }}>
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                      </Link>
                    ) : (
                      <div onClick={() => markRead(n.id)} role="presentation">
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                      </div>
                    )}
                    <small>{formatRelative(n.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
