import { supabase } from './supabase'
import type { NotificationItem } from './types'

const LOCAL_KEY = 'integra_notifications'

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

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  if (!supabase) {
    return readLocal()
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as NotificationItem[]
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  if (!supabase) {
    writeLocal(readLocal().map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    return
  }
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const now = new Date().toISOString()
  if (!supabase) {
    writeLocal(readLocal().map((n) => (n.user_id === userId ? { ...n, read_at: now } : n)))
    return
  }
  await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
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

  if (!supabase) {
    writeLocal([row, ...readLocal()])
    return
  }

  await supabase.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
    kind: params.kind ?? 'info',
  })
}

/** Notifica a todos los abogados/admin */
export async function notifyLawyers(params: {
  title: string
  body?: string
  link?: string
  kind?: NotificationItem['kind']
}): Promise<void> {
  if (!supabase) return
  const { data: lawyers } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('role', ['admin', 'abogado'])

  for (const p of lawyers ?? []) {
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
