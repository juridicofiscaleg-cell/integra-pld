import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

const IDLE_MS = 45 * 60 * 1000

export function SessionTimeout() {
  const { signOut, isDemo } = useAuth()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDemo) return

    function reset() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (window.confirm('Tu sesión expiró por inactividad. ¿Cerrar sesión?')) {
          void signOut()
        }
      }, IDLE_MS)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [isDemo, signOut])

  return null
}
