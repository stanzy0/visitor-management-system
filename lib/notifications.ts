import type { Notification } from '@/lib/types/notification'
import { getAuthHeaders } from '@/lib/client/api'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'visitor' | 'appointment' | 'employee' | 'system' | 'watchlist_match' | 'watchlist_added' | 'watchlist_updated' | 'watchlist_override'

export type { Notification }

export async function getNotifications(userId: string | null, limit: number = 50) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (userId) params.set('user_id', userId)
  const res = await fetch(`/api/notifications?${params.toString()}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data || []) as Notification[]
}

export async function getUnreadCount(userId: string | null) {
  if (!userId) return 0
  const res = await fetch(`/api/notifications?limit=1&user_id=${userId}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) return 0
  const json = await res.json()
  return json.unreadCount || 0
}

export async function markAsRead(notificationId: string) {
  const res = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ action: 'mark_read' }),
  })
  return res.ok
}

export async function markAllAsRead(userId: string | null) {
  const res = await fetch(`/api/notifications/${userId || 'me'}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ action: 'mark_all_read' }),
  })
  return res.ok
}

export async function deleteNotification(notificationId: string) {
  const res = await fetch(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })
  return res.ok
}
