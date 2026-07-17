import { useCallback, useEffect, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED,
} from '../lib/notifications'
import type { NotificationItem } from '../lib/types'

export function useNotifications(userId?: string) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | undefined>()

  const refetch = useCallback(async () => {
    if (!userId) {
      setItems([])
      setDbError(undefined)
      setLoading(false)
      return
    }
    setLoading(true)
    const { items: data, dbError: err } = await fetchNotifications(userId)
    setItems(data)
    setDbError(err)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refetch()
    const t = setInterval(refetch, 30_000)
    const onChanged = () => refetch()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refetch])

  const unread = items.filter((n) => !n.read_at)

  async function markRead(id: string) {
    if (!userId) return
    await markNotificationRead(id, userId)
    refetch()
  }

  async function markAllRead() {
    if (!userId) return
    await markAllNotificationsRead(userId)
    refetch()
  }

  return { items, unread, loading, dbError, refetch, markRead, markAllRead }
}
