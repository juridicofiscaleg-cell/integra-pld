import { useCallback, useEffect, useState } from 'react'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/notifications'
import type { NotificationItem } from '../lib/types'

export function useNotifications(userId?: string) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const data = await fetchNotifications(userId)
    setItems(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refetch()
    const t = setInterval(refetch, 60_000)
    return () => clearInterval(t)
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

  return { items, unread, loading, refetch, markRead, markAllRead }
}
