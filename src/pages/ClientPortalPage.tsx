import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { appUrl } from '../lib/utils'

export function ClientPortalPage() {
  return (
    <div className="login-page">
      <div className="login-card card" style={{ maxWidth: 480 }}>
        <h1>Portal del cliente</h1>
        <p>
          El acceso por enlace temporal fue reemplazado por <strong>cuentas con código de acceso</strong>.
          Su despacho asesor le compartirá un código para registrarse e ingresar de forma segura.
        </p>
        <p className="cell-sub">
          Ideal para el oficial de cumplimiento designado: consulta expedientes, estatus KYC y sube documentación.
        </p>
        <Link to="/login?modo=cliente">
          <Button><KeyRound size={16} /> Ir a registro con código</Button>
        </Link>
      </div>
    </div>
  )
}

/** Modal en ficha de cliente para generar código de acceso */
export function ClientAccessInviteModal({
  open,
  onClose,
  clientName,
  onGenerate,
  generating,
  result,
  error,
}: {
  open: boolean
  onClose: () => void
  clientName: string
  onGenerate: (email: string) => void
  generating: boolean
  result?: { code: string; expiresAt: string }
  error?: string
}) {
  const [email, setEmail] = useState('')

  return (
    <Modal open={open} onClose={onClose} title={`Acceso portal — ${clientName}`}>
      <p className="cell-sub">
        Genere un código para el oficial de cumplimiento o contacto del cliente. Podrá crear su cuenta
        y ver únicamente la información de esta empresa.
      </p>
      {!result ? (
        <>
          <Input
            label="Correo del contacto (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="oficial@empresa.com"
          />
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button disabled={generating} onClick={() => onGenerate(email)}>
              {generating ? 'Generando...' : 'Generar código'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="invite-code-box">
            <span>Código de acceso</span>
            <strong>{result.code}</strong>
            <small>Válido hasta {new Date(result.expiresAt).toLocaleDateString('es-MX')}</small>
          </div>
          <p className="cell-sub">
            Comparta este código con su cliente. Debe ir a <em>Iniciar sesión → Acceso cliente</em> y registrarse con el código.
          </p>
          <div className="modal-actions">
            <Button
              onClick={async () => {
                const text = `Código de acceso Integra PLD para ${clientName}: ${result.code}\nRegistro: ${appUrl('login?modo=cliente')}`
                await navigator.clipboard.writeText(text)
              }}
            >
              Copiar instrucciones
            </Button>
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
