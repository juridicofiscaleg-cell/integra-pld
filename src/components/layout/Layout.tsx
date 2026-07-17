import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Briefcase,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApprovalRequests } from '../../hooks/useApprovalRequests'
import {
  canReviewApprovals,
  mobileNavItems,
  navItemsForRole,
  type NavItem,
} from '../../lib/permissions'
import { ROLE_LABELS } from '../../lib/types'
import { NotificationBell } from './NotificationBell'
import { SessionTimeout } from './SessionTimeout'
import { cn } from '../../lib/utils'

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { profile, signOut, isDemo } = useAuth()
  const { pending } = useApprovalRequests()
  const [menuOpen, setMenuOpen] = useState(false)

  const role = profile?.role
  const navItems = navItemsForRole(role)
  const bottomNav = mobileNavItems(role)
  const showApprovalBadge = canReviewApprovals(role) && pending.length > 0

  function isActive(to: string) {
    return pathname === to || (to !== '/' && pathname.startsWith(to))
  }

  function renderNavLink({ to, icon: Icon, label }: NavItem, onNavigate?: () => void) {
    const active = isActive(to)
    const isApprovals = to === '/autorizaciones'
    return (
      <Link
        key={to}
        to={to}
        className={cn('nav-link', active && 'nav-link-active')}
        onClick={onNavigate}
      >
        <Icon size={18} />
        <span className="nav-link-label">{label}</span>
        {isApprovals && showApprovalBadge && (
          <span className="nav-badge">{pending.length}</span>
        )}
      </Link>
    )
  }

  return (
    <div className="app-shell">
      <SessionTimeout />
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {menuOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={cn('sidebar', menuOpen && 'sidebar-open')}>
        <div className="sidebar-brand">
          <Briefcase size={22} />
          <div>
            <strong>Integra PLD</strong>
            <span>Expedientes · KYC · Cumplimiento</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => renderNavLink(item, () => setMenuOpen(false)))}
        </nav>

        <div className="sidebar-footer">
          {isDemo && (
            <div className="demo-banner">
              Modo demo — conecta Supabase para datos reales
            </div>
          )}
          <Link to="/configuracion" className="nav-link" onClick={() => setMenuOpen(false)}>
            <Settings size={18} />
            Configuración
          </Link>
          <div className="user-info">
            <NotificationBell placement="footer" />
            <div className="user-avatar">{profile?.full_name?.charAt(0) ?? 'A'}</div>
            <div>
              <strong>{profile?.full_name ?? 'Usuario'}</strong>
              <span>{role ? ROLE_LABELS[role] : '—'}</span>
            </div>
          </div>
          <button className="nav-link sign-out" onClick={() => signOut()}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="app-body">
        <div className="top-bar-mobile">
          <NotificationBell />
        </div>
        <main className="main-content">{children}</main>

        <nav className="bottom-nav" aria-label="Navegación principal">
          {bottomNav.map(({ to, icon: Icon, label }) => {
            const active = isActive(to)
            return (
              <Link key={to} to={to} className={cn('bottom-nav-item', active && 'active')}>
                <Icon size={20} />
                <span>{label.split(' ')[0]}</span>
              </Link>
            )
          })}
          <Link
            to={canReviewApprovals(role) ? '/autorizaciones' : '/configuracion'}
            className={cn('bottom-nav-item', isActive('/autorizaciones') && 'active')}
          >
            {canReviewApprovals(role) ? (
              <>
                <span className="bottom-nav-icon-wrap">
                  <ShieldCheck size={20} />
                  {showApprovalBadge && <span className="bottom-nav-dot">{pending.length}</span>}
                </span>
                <span>Autorizar</span>
              </>
            ) : (
              <>
                <Settings size={20} />
                <span>Más</span>
              </>
            )}
          </Link>
        </nav>
      </div>
    </div>
  )
}
