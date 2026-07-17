import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { DEMO_PROFILE } from '../lib/demo-data'
import { ensureAccountApprovalRequest, validateClientInvite } from '../lib/api'
import { getAuthErrorMessage } from '../lib/auth-errors'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string; success?: string }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
    inviteCode?: string,
  ) => Promise<{ error?: string; success?: string }>
  resendConfirmation: (email: string) => Promise<{ error?: string; success?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const isDemo = !isSupabaseConfigured

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }

    if (!supabase) return

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) loadProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) loadProfile(s.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [isDemo])

  useEffect(() => {
    if (isDemo || !user?.id) return

    function onVisible() {
      if (document.visibilityState === 'visible') loadProfile(user!.id)
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isDemo, user?.id])

  async function loadProfile(userId: string) {
    if (!supabase) return

    const { data: sessionData } = await supabase.auth.getUser()
    const authUser = sessionData.user

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (data) {
      setProfile(data)
      if (data.account_status === 'pendiente' && data.role !== 'cliente') {
        void ensureAccountApprovalRequest(data)
      }
      setLoading(false)
      return
    }

    if (error?.code === 'PGRST116' && authUser) {
      const inviteCode = String(authUser.user_metadata?.invite_code ?? '').trim()
      const isClientSignup = inviteCode.length > 0

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'Usuario',
          email: authUser.email ?? '',
          role: isClientSignup ? 'cliente' : 'asistente',
          account_status: isClientSignup ? 'activo' : 'pendiente',
        })
        .select()
        .single()

      if (created) {
        setProfile(created)
        if (created.account_status === 'pendiente') {
          void ensureAccountApprovalRequest(created)
        }
        setLoading(false)
        return
      }

      if (insertError) {
        console.error('No se pudo crear el perfil:', insertError.message)
      }
    }

    setProfile(null)
    setLoading(false)
  }

  async function refreshProfile() {
    if (isDemo || !user?.id) return
    await loadProfile(user.id)
  }

  async function signIn(email: string, password: string) {
    if (isDemo) {
      setProfile(DEMO_PROFILE)
      return { success: 'Entrando al modo demo...' }
    }
    if (!supabase) return { error: 'Supabase no configurado' }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) return { error: getAuthErrorMessage(error, 'login') }
      if (data.user) await loadProfile(data.user.id)
      return { success: 'Sesión iniciada.' }
    } catch (err) {
      return { error: getAuthErrorMessage(err, 'login') }
    }
  }

  async function signUp(email: string, password: string, fullName: string, inviteCode?: string) {
    if (!supabase) return { error: 'Supabase no configurado' }

    const code = inviteCode?.trim().toUpperCase()
    let check: Awaited<ReturnType<typeof validateClientInvite>> | undefined
    if (code) {
      check = await validateClientInvite(code)
      if (!check.valid) return { error: check.error ?? 'Código de acceso no válido' }
      if (check.intendedEmail && email.trim().toLowerCase() !== check.intendedEmail.toLowerCase()) {
        return { error: `Use el correo autorizado: ${check.intendedEmail}` }
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            ...(code ? { invite_code: code } : {}),
          },
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '') + '/',
        },
      })

      if (error) return { error: getAuthErrorMessage(error, 'register') }

      if (data.user?.identities?.length === 0) {
        return {
          error:
            'Este correo ya está registrado. Usa "Inicia sesión". Si no confirmaste el correo, revisa tu bandeja y spam.',
        }
      }

      if (data.session?.user) {
        await loadProfile(data.session.user.id)
        if (code && check) {
          return {
            success: `Cuenta creada${check.clientName ? ` para ${check.clientName}` : ''}. Ya puede acceder a su portal.`,
          }
        }
        return {
          success:
            'Cuenta creada. Un abogado del despacho debe autorizar tu acceso antes de que puedas entrar al sistema.',
        }
      }

      if (data.user) {
        if (code) {
          return {
            success:
              'Cuenta creada. Confirma tu correo si se solicita y luego inicia sesión en Acceso cliente.',
          }
        }
        return {
          success:
            'Cuenta creada. Confirma tu correo si se solicita. Luego un abogado debe autorizar tu acceso en Autorizaciones.',
        }
      }

      return { error: 'No se pudo crear la cuenta. Intenta con otro correo.' }
    } catch (err) {
      return { error: getAuthErrorMessage(err, 'register') }
    }
  }

  async function resendConfirmation(email: string) {
    if (!supabase) return { error: 'Supabase no configurado' }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })
      if (error) return { error: getAuthErrorMessage(error, 'login') }
      return { success: 'Correo de confirmación reenviado. Revisa tu bandeja y spam.' }
    } catch (err) {
      return { error: getAuthErrorMessage(err, 'login') }
    }
  }

  async function signOut() {
    if (isDemo) {
      setProfile(null)
      return
    }
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isDemo, signIn, signUp, resendConfirmation, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
