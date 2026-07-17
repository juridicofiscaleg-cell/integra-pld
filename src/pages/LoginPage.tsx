import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Briefcase, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getAuthErrorMessage } from '../lib/auth-errors'
import { validateClientInvite } from '../lib/api'
import { isClientPortalUser } from '../lib/permissions'

type AuthMode = 'login' | 'register' | 'client'

export function LoginPage() {
  const { signIn, signUp, resendConfirmation, loading, profile, isDemo } = useAuth()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('modo') === 'cliente' ? 'client' : 'register'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteClientName, setInviteClientName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showResend, setShowResend] = useState(false)

  useEffect(() => {
    if (searchParams.get('modo') === 'cliente') setMode('client')
  }, [searchParams])

  useEffect(() => {
    if (mode !== 'client' || inviteCode.trim().length < 6) {
      setInviteClientName('')
      return
    }
    const t = setTimeout(async () => {
      const r = await validateClientInvite(inviteCode)
      setInviteClientName(r.valid && r.clientName ? r.clientName : '')
    }, 400)
    return () => clearTimeout(t)
  }, [inviteCode, mode])

  if (!loading && profile) {
    return <Navigate to={isClientPortalUser(profile.role) ? '/mi-portal' : '/'} replace />
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setSuccess('')
    setShowResend(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setShowResend(false)
    setSubmitting(true)

    if (!isDemo && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setSubmitting(false)
      return
    }

    try {
      if (isDemo) {
        const result = await signIn(email, password)
        if (result.error) setError(result.error)
        else if (result.success) setSuccess(result.success)
        setSubmitting(false)
        return
      }

      const result =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password, fullName, mode === 'client' ? inviteCode : undefined)

      if (result.error) {
        const msg =
          typeof result.error === 'string'
            ? getAuthErrorMessage(result.error, mode === 'login' ? 'login' : 'register')
            : getAuthErrorMessage(result.error, mode === 'login' ? 'login' : 'register')
        setError(msg)
        if (mode === 'login' && msg.toLowerCase().includes('confirm')) {
          setShowResend(true)
        }
      } else if (result.success) {
        setSuccess(result.success)
      } else {
        setError(
          mode === 'login'
            ? 'No se pudo iniciar sesión. Intenta de nuevo.'
            : 'No se pudo crear la cuenta. Intenta de nuevo.',
        )
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, mode === 'login' ? 'login' : 'register'))
    }

    setSubmitting(false)
  }

  async function handleResend() {
    if (!email.trim()) {
      setError('Escribe tu correo para reenviar la confirmación.')
      return
    }
    setSubmitting(true)
    const result = await resendConfirmation(email)
    if (result.error) setError(result.error)
    else if (result.success) setSuccess(result.success)
    setSubmitting(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Briefcase size={32} />
          <h1>Integra PLD</h1>
          <p>{mode === 'client' ? 'Acceso portal del cliente' : 'Seguimiento de asuntos, expedientes y KYC'}</p>
        </div>

        {!isDemo && (
          <p className="connection-status">
            ✓ Conectado a Supabase ({import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0]})
          </p>
        )}

        {isDemo && (
          <div className="demo-notice">
            <strong>⚠ No detecté conexión a Supabase.</strong> Verifica que exista el archivo <code>.env</code> y reinicia el servidor.
          </div>
        )}

        {!isDemo && (
          <div className="auth-tabs auth-tabs-three">
            <button
              type="button"
              className={mode === 'register' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => switchMode('register')}
            >
              Personal despacho
            </button>
            <button
              type="button"
              className={mode === 'client' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => switchMode('client')}
            >
              <KeyRound size={14} /> Acceso cliente
            </button>
            <button
              type="button"
              className={mode === 'login' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => switchMode('login')}
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {mode === 'client' && (
          <p className="cell-sub auth-mode-hint">
            Use el código que le compartió su despacho asesor (oficial de cumplimiento o contacto autorizado).
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'client' && (
            <>
              <Input
                label="Código de acceso"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="PLD-XXXXXXXX"
                required
              />
              {inviteClientName && (
                <p className="form-success">Acceso para: <strong>{inviteClientName}</strong></p>
              )}
            </>
          )}
          {mode !== 'login' && (
            <Input
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!isDemo}
          />
          <Input
            label="Contraseña (mínimo 6 caracteres)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isDemo}
            minLength={6}
          />
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <Button type="submit" disabled={submitting} className="login-btn">
            {submitting
              ? 'Cargando...'
              : mode === 'login'
                ? 'Entrar'
                : mode === 'client'
                  ? 'Crear cuenta de cliente'
                  : 'Crear cuenta'}
          </Button>
        </form>

        {!isDemo && showResend && (
          <button type="button" className="resend-link" onClick={handleResend} disabled={submitting}>
            Reenviar correo de confirmación
          </button>
        )}

        {isDemo && (
          <p className="login-toggle">
            Modo demo — solo haz clic en Entrar.
          </p>
        )}
      </div>
    </div>
  )
}
