import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../lib/types'

export function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="client-portal-shell">
      <header className="client-portal-header">
        <div>
          <strong>Integra PLD</strong>
          <span>Portal del cliente · canal seguro con su despacho asesor</span>
        </div>
        <div className="client-portal-user">
          <div>
            <strong>{profile?.full_name}</strong>
            <span>{ROLE_LABELS.cliente}</span>
          </div>
          <Link to="/mi-portal" className="client-portal-nav-link">Mi cuenta</Link>
          <button type="button" className="nav-link sign-out client-portal-signout" onClick={() => signOut()}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>
      <main className="client-portal-main">{children}</main>
    </div>
  )
}
