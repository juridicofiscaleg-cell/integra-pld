import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calendar,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Scale,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/expedientes', icon: FolderOpen, label: 'Expedientes' },
  { to: '/kyc', icon: FileCheck, label: 'KYC' },
  { to: '/cumplimiento', icon: Scale, label: 'Oficiales de Cumplimiento' },
  { to: '/operaciones', icon: ClipboardList, label: 'Operaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/biblioteca', icon: BookOpen, label: 'Biblioteca' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/bitacora', icon: Shield, label: 'Bitácora' },
  { to: '/reportes', icon: FileSpreadsheet, label: 'Reportes' },
  { to: '/buscar', icon: Search, label: 'Buscar' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { profile, signOut, isDemo } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Briefcase size={22} />
          <div>
            <strong>Integra PLD</strong>
            <span>Expedientes · KYC · Cumplimiento</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn('nav-link', (pathname === to || (to !== '/' && pathname.startsWith(to))) && 'nav-link-active')}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isDemo && (
            <div className="demo-banner">
              Modo demo — conecta Supabase para datos reales
            </div>
          )}
          <Link to="/configuracion" className="nav-link">
            <Settings size={18} />
            Configuración
          </Link>
          <div className="user-info">
            <div className="user-avatar">{profile?.full_name?.charAt(0) ?? 'A'}</div>
            <div>
              <strong>{profile?.full_name ?? 'Usuario'}</strong>
              <span>{profile?.role ?? 'abogado'}</span>
            </div>
          </div>
          <button className="nav-link sign-out" onClick={() => signOut()}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
