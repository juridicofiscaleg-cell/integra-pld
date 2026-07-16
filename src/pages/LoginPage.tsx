import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getAuthErrorMessage } from '../lib/auth-errors'

export function LoginPage() {
  const { signIn, signUp, resendConfirmation, loading, profile, isDemo } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showResend, setShowResend] = useState(false)

  if (!loading && profile) {
    return <Navigate to="/" replace />
  }

  function switchMode(next: 'login' | 'register') {
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
          : await signUp(email, password, fullName)

      if (result.error) {
        const msg =
          typeof result.error === 'string'
            ? getAuthErrorMessage(result.error, mode)
            : getAuthErrorMessage(result.error, mode)
        setError(msg)
        if (mode === 'login' && msg.toLowerCase().includes('confirm')) {
          setShowResend(true)
        }
      } else if (result.success) {
        setSuccess(result.success)
      } else {
        setError(
          mode === 'register'
            ? 'No se pudo crear la cuenta. Intenta de nuevo.'
            : 'No se pudo iniciar sesión. Intenta de nuevo.',
        )
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, mode))
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
          <p>Seguimiento de asuntos, expedientes y KYC</p>
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
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'register' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => switchMode('register')}
            >
              Crear cuenta
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

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
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
            {submitting ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
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
