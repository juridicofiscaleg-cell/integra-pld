export type AuthMode = 'login' | 'register'

export function getAuthErrorMessage(error: unknown, mode: AuthMode = 'login'): string {
  if (!error) return 'Ocurrió un error desconocido.'

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (!trimmed || trimmed === '{}') {
      return mode === 'register'
        ? 'No se pudo crear la cuenta. Verifica tu correo y contraseña (mínimo 6 caracteres).'
        : 'No se pudo iniciar sesión. Verifica tu correo y contraseña.'
    }
    return translateAuthMessage(trimmed, mode)
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      message?: string
      msg?: string
      error_description?: string
      status?: number
      code?: string
    }

    const message = (err.message ?? err.msg ?? err.error_description ?? '').trim()
    const code = (err.code ?? '').toLowerCase()

    if (code === 'email_not_confirmed') {
      return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada y spam.'
    }

    if (message && message !== '{}') {
      return translateAuthMessage(message, mode)
    }

    if (err.status === 422) {
      return 'Datos inválidos. Revisa correo y contraseña (mínimo 6 caracteres).'
    }
  }

  return mode === 'register'
    ? 'No se pudo crear la cuenta. Intenta de nuevo.'
    : 'No se pudo iniciar sesión. Intenta de nuevo.'
}

function translateAuthMessage(message: string, mode: AuthMode): string {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    if (mode === 'register') {
      return 'Este correo ya está registrado o la contraseña no cumple los requisitos. Prueba "Inicia sesión" o usa otro correo.'
    }
    return 'Correo o contraseña incorrectos. Si acabas de registrarte, confirma tu correo primero (revisa spam).'
  }

  if (lower.includes('email not confirmed')) {
    return 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada y spam.'
  }

  if (lower.includes('database error')) {
    return 'Error en la base de datos. Vuelve a ejecutar schema.sql en Supabase.'
  }

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Este correo ya está registrado. Usa "Inicia sesión".'
  }

  if (lower.includes('password')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }

  if (lower.includes('invalid email')) {
    return 'El correo electrónico no es válido.'
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
  }

  return message
}
