import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Notification, NotificationFilters, NotificationStats, NotificationPreferences } from '@/lib/types/notification'

export async function getNotifications(filters: NotificationFilters, userId: string | null, userRole: string | null): Promise<Notification[]> {
  if (!supabaseAdmin) return []

  let query = supabaseAdmin
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId && userRole) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (userRole) {
    query = query.eq('recipient_role', userRole)
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`)
  }

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  if (filters.read && filters.read !== 'all') {
    query = query.eq('is_read', filters.read === 'read')
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query.limit(20)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }

  return (data || []) as Notification[]
}

export async function getNotificationStats(userId: string | null, userRole: string | null): Promise<NotificationStats> {
  if (!supabaseAdmin) {
    return { total: 0, unread: 0, read: 0, byType: {}, byPriority: {}, avgResponseTime: null }
  }

  let query = supabaseAdmin.from('notifications').select('*')

  if (userId && userRole) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (userRole) {
    query = query.eq('recipient_role', userRole)
  }

  const { data, error } = await query

  if (error || !data) {
    return { total: 0, unread: 0, read: 0, byType: {}, byPriority: {}, avgResponseTime: null }
  }

  const notifications = data as Notification[]
  const total = notifications.length
  const unread = notifications.filter(n => !n.is_read).length
  const read = notifications.filter(n => n.is_read).length

  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}

  notifications.forEach(n => {
    byType[n.type] = (byType[n.type] || 0) + 1
    byPriority[n.priority] = (byPriority[n.priority] || 0) + 1
  })

  return {
    total,
    unread,
    read,
    byType,
    byPriority,
    avgResponseTime: null,
  }
}

export async function getUnreadCount(userId: string | null, userRole: string | null): Promise<number> {
  if (!supabaseAdmin) return 0

  let query = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  if (userId && userRole) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (userRole) {
    query = query.eq('recipient_role', userRole)
  }

  const { count, error } = await query

  if (error) {
    console.error('Failed to fetch unread count:', error)
    return 0
  }

  return count || 0
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return false
  }

  return true
}

export async function markAllNotificationsAsRead(userId: string | null, userRole: string | null): Promise<boolean> {
  if (!supabaseAdmin) return false

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (userId && userRole) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (userRole) {
    query = query.eq('recipient_role', userRole)
  }

  const { error } = await query

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    return false
  }

  return true
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to delete notification:', error)
    return false
  }

  return true
}

export async function deleteReadNotifications(userId: string | null, userRole: string | null): Promise<boolean> {
  if (!supabaseAdmin) return false

  let query = supabaseAdmin
    .from('notifications')
    .delete()
    .eq('is_read', true)

  if (userId && userRole) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (userRole) {
    query = query.eq('recipient_role', userRole)
  }

  const { error } = await query

  if (error) {
    console.error('Failed to delete read notifications:', error)
    return false
  }

  return true
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    email: data.email ?? true,
    browser: data.browser ?? true,
    sms: data.sms ?? false,
    system: data.system ?? true,
    appointmentReminders: data.appointment_reminders ?? true,
    securityAlerts: data.security_alerts ?? true,
    hostNotifications: data.host_notifications ?? true,
    visitorNotifications: data.visitor_notifications ?? true,
  }
}

export async function updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      email: preferences.email ?? true,
      browser: preferences.browser ?? true,
      sms: preferences.sms ?? false,
      system: preferences.system ?? true,
      appointment_reminders: preferences.appointmentReminders ?? true,
      security_alerts: preferences.securityAlerts ?? true,
      host_notifications: preferences.hostNotifications ?? true,
      visitor_notifications: preferences.visitorNotifications ?? true,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to update notification preferences:', error)
    return false
  }

  return true
}
