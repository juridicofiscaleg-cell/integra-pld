import { Clock, LogOut } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export function PendingAccountPage() {
  const { profile, signOut, refreshProfile } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card card" style={{ maxWidth: 480 }}>
        <div className="login-brand">
          <Clock size={40} />
          <h1>Cuenta en revisión</h1>
        </div>
        <p>
          Hola <strong>{profile?.full_name}</strong>, tu registro fue recibido.
        </p>
        <p className="card-desc">
          El Lic. Adrian Gerardo (o un abogado del despacho) debe autorizar tu acceso en{' '}
          <strong>Autorizaciones</strong> antes de que puedas usar el sistema.
        </p>
        <p className="cell-sub">{profile?.email}</p>
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={() => refreshProfile()}>
            Verificar estado
          </Button>
          <Button variant="secondary" onClick={() => signOut()}>
            <LogOut size={16} /> Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export function RejectedAccountPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card card" style={{ maxWidth: 480 }}>
        <h1>Acceso denegado</h1>
        <p>
          La solicitud de acceso para <strong>{profile?.email}</strong> fue rechazada.
        </p>
        <p className="card-desc">Contacta al administrador del despacho si crees que es un error.</p>
        <Button variant="secondary" onClick={() => signOut()}>
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
