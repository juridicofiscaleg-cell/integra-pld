import { supabase } from './supabase'
import type { NotificationItem } from './types'

const LOCAL_KEY = 'integra_notifications'
export const NOTIFICATIONS_CHANGED = 'integra-notifications-changed'

function readLocal(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as NotificationItem[]) : []
  } catch {
    return []
  }
}

function writeLocal(list: NotificationItem[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 100)))
}

function emitChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED))
}

export type FetchNotificationsResult = {
  items: NotificationItem[]
  dbError?: string
}

export async function fetchNotifications(userId: string): Promise<FetchNotificationsResult> {
  const local = readLocal()
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (!supabase) {
    return { items: local }
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    const msg = error.message.includes('does not exist')
      ? 'Falta la tabla notifications. Ejecuta supabase/ejecutar-en-supabase.sql en Supabase.'
      : error.message
    return { items: local, dbError: msg }
  }

  const remote = (data ?? []) as NotificationItem[]
  const merged = [...remote]
  for (const n of local) {
    if (!merged.some((r) => r.id === n.id)) merged.push(n)
  }
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { items: merged.slice(0, 50) }
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  writeLocal(readLocal().map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))

  if (!supabase) {
    emitChanged()
    return
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) console.warn('markNotificationRead:', error.message)
  emitChanged()
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const now = new Date().toISOString()
  writeLocal(readLocal().map((n) => (n.user_id === userId ? { ...n, read_at: now } : n)))

  if (!supabase) {
    emitChanged()
    return
  }

  const { error } = await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
  if (error) console.warn('markAllNotificationsRead:', error.message)
  emitChanged()
}

export async function createNotification(params: {
  userId: string
  title: string
  body?: string
  link?: string
  kind?: NotificationItem['kind']
}): Promise<void> {
  const row: NotificationItem = {
    id: crypto.randomUUID(),
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link: params.link,
    kind: params.kind ?? 'info',
    created_at: new Date().toISOString(),
  }

  writeLocal([row, ...readLocal()])

  if (!supabase) {
    emitChanged()
    return
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
    kind: params.kind ?? 'info',
  })

  if (error) {
    console.warn('createNotification:', error.message)
  }
  emitChanged()
}

/** Notifica a abogados/admin con cuenta activa */
export async function notifyLawyers(params: {
  title: string
  body?: string
  link?: string
  kind?: NotificationItem['kind']
}): Promise<void> {
  if (!supabase) return
  const { data: lawyers } = await supabase
    .from('profiles')
    .select('id, email, full_name, account_status')
    .in('role', ['admin', 'abogado'])

  for (const p of lawyers ?? []) {
    if (p.account_status && p.account_status !== 'activo') continue
    await createNotification({ userId: p.id, ...params })
    if (p.email) {
      openMailto(p.email, params.title, params.body ?? '')
    }
  }
}

export function openMailto(email: string, subject: string, body: string): void {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(url, '_blank')
}
