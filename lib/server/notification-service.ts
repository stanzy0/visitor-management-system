import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Notification, NotificationFilters, NotificationStats, NotificationPreferences } from '@/lib/types/notification'

export const RECIPIENT_ROLES = {
  Admin: 'Admin',
  Receptionist: 'Receptionist',
  Security: 'Security',
  Visitor: 'Visitor',
  Host: 'Host',
} as const

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'visitor'
  | 'appointment'
  | 'employee'
  | 'system'
  | 'watchlist_match'
  | 'watchlist_added'
  | 'watchlist_updated'
  | 'watchlist_override'

const isDev = process.env.NODE_ENV === 'development'

function logDev(...args: unknown[]) {
  if (isDev) console.log(...args)
}

function logError(...args: unknown[]) {
  console.error(...args)
}

async function logNotificationAudit(notification: Notification, action: string = 'created') {
  try {
    if (!supabaseAdmin) return

    await supabaseAdmin.from('audit_logs').insert({
      action: `notification_${action}`,
      entity_type: 'notification',
      entity_id: notification.id,
      performed_by: 'system',
      details: JSON.stringify({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        user_id: notification.user_id,
        recipient_role: notification.recipient_role,
        related_type: notification.related_type,
        related_id: notification.related_id,
      }),
    })
  } catch (err) {
    logError('Failed to log notification audit:', err)
  }
}

export async function createNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  userId?: string | null,
  recipientRole?: string | null,
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  const resolvedUserId = userId || null
  const resolvedRecipientRole = recipientRole || null

  if (!resolvedUserId && !resolvedRecipientRole) {
    logError('Notification rejected: both user_id and recipient_role are null', { title, message, type })
    return null
  }

  try {
    if (!supabaseAdmin) {
      logError('Failed to create notification: supabaseAdmin not configured')
      return null
    }

    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('message', message)
      .eq('related_type', relatedType || null)
      .eq('related_id', relatedId || null)
      .gte('created_at', fiveSecondsAgo)
      .or(
        resolvedUserId && resolvedRecipientRole
          ? `user_id.eq.${resolvedUserId},recipient_role.eq.${resolvedRecipientRole}`
          : resolvedUserId
            ? `user_id.eq.${resolvedUserId}`
            : `recipient_role.eq.${resolvedRecipientRole}`
      )
      .limit(1)

    if (existing && existing.length > 0) {
      logDev('Duplicate notification skipped', { title, message, type })
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        title,
        message,
        type,
        user_id: resolvedUserId,
        recipient_role: resolvedRecipientRole,
        related_type: relatedType || null,
        related_id: relatedId || null,
      })
      .select('*')
      .single()

    if (error) {
      logError('Failed to create notification:', error)
      return null
    }

    if (data) {
      logDev('Notification Created:', {
        title,
        message,
        type,
        userId: resolvedUserId,
        recipientRole: resolvedRecipientRole,
      })

      await logNotificationAudit(data as Notification)

      return data as Notification
    }

    logError('Failed to create notification: No data returned')
    return null
  } catch (err) {
    logError('Notification creation failed:', err)
    return null
  }
}

export async function createAdminNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(title, message, type, null, RECIPIENT_ROLES.Admin, relatedType, relatedId)
}

export async function createReceptionistNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(
    title,
    message,
    type,
    null,
    RECIPIENT_ROLES.Receptionist,
    relatedType,
    relatedId
  )
}

export async function createSecurityNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(title, message, type, null, RECIPIENT_ROLES.Security, relatedType, relatedId)
}

export async function createVisitorNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(title, message, type, userId, RECIPIENT_ROLES.Visitor, relatedType, relatedId)
}

export async function createHostNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(title, message, type, userId, RECIPIENT_ROLES.Host, relatedType, relatedId)
}

export async function createSystemNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
): Promise<Notification | null> {
  return createNotification(title, message, type, null, RECIPIENT_ROLES.Admin, relatedType, relatedId)
}

export async function getNotifications(
  filters: NotificationFilters,
  userId: string | null,
  userRole: string | null
): Promise<{ data: Notification[]; total: number }> {
  if (!supabaseAdmin) return { data: [], total: 0 }

  const limit = filters.limit || 20
  const page = filters.page || 1
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: filters.sortOrder === 'oldest' })

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

  if (filters.read && filters.read !== 'all') {
    query = query.eq('is_read', filters.read === 'read')
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return { data: [], total: 0 }
  }

  return { data: (data || []) as Notification[], total: count || 0 }
}

export async function getNotificationStats(
  userId: string | null,
  userRole: string | null
): Promise<NotificationStats> {
  if (!supabaseAdmin) {
    return { total: 0, unread: 0, read: 0, byType: {}, avgResponseTime: null }
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
    return { total: 0, unread: 0, read: 0, byType: {}, avgResponseTime: null }
  }

  const notifications = data as Notification[]
  const total = notifications.length
  const unread = notifications.filter((n) => !n.is_read).length
  const read = notifications.filter((n) => n.is_read).length

  const byType: Record<string, number> = {}

  notifications.forEach((n) => {
    byType[n.type] = (byType[n.type] || 0) + 1
  })

  return {
    total,
    unread,
    read,
    byType,
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

export async function markAsRead(notificationId: string): Promise<boolean> {
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

export async function markAllAsRead(userId: string | null, userRole: string | null): Promise<boolean> {
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

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
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
