import { supabase } from './supabase'
import { logAuditAction } from './audit'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'visitor' | 'appointment' | 'employee' | 'system' | 'watchlist_match' | 'watchlist_added' | 'watchlist_updated' | 'watchlist_override'

export interface Notification {
  id: string
  user_id: string | null
  recipient_role: string | null
  title: string
  message: string
  type: NotificationType
  related_type: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export async function createNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  userId?: string | null,
  recipientRole?: string | null,
  relatedType?: string,
  relatedId?: string
) {
  try {
    const { data, error } = await supabase.from('notifications').insert({
      title,
      message,
      type,
      user_id: userId || null,
      recipient_role: recipientRole || null,
      related_type: relatedType || null,
      related_id: relatedId || null,
    }).select().single()

    if (error) {
      console.error('Failed to create notification:', error)
      return null
    }

    await logAuditAction('Notification Created', 'notification', data.id, `Title: ${title}`)
    return data
  } catch (err) {
    console.error('Failed to create notification:', err)
    return null
  }
}

export async function createAdminNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  return createNotification(title, message, type, null, 'Admin', relatedType, relatedId)
}

export async function createReceptionistNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  return createNotification(title, message, type, null, 'Receptionist', relatedType, relatedId)
}

export async function createSecurityNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  return createNotification(title, message, type, null, 'Security', relatedType, relatedId)
}

export async function createHostNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  return createNotification(title, message, type, userId, null, relatedType, relatedId)
}

export async function createHostEmployeeNotification(
  employeeId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single()

    if (employee?.user_id) {
      return createNotification(title, message, type, employee.user_id, null, relatedType, relatedId)
    }

    return null
  } catch {
    return null
  }
}

export async function createSystemNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  relatedType?: string,
  relatedId?: string
) {
  return createNotification(title, message, type, null, null, relatedType, relatedId)
}

export async function getNotifications(userId: string | null, limit: number = 50) {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)

  if (userId) {
    const { data: userRole } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    if (userRole?.role) {
      query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole.role}`)
    }
  }

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
  return data as Notification[]
}

export async function getUnreadCount(userId: string | null) {
  if (!userId) return 0

  const { data: userRole } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()

  let query = supabase.from('notifications').select('id', { count: 'exact' }).eq('is_read', false)

  if (userRole?.role) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole.role}`)
  }

  const { count, error } = await query
  if (error) {
    console.error('Failed to fetch unread count:', error)
    return 0
  }
  return count ?? 0
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)

  if (error) return false

  await logAuditAction('Notification Read', 'notification', notificationId, `Marked as read`)
  return true
}

export async function markAllAsRead(userId: string | null) {
  if (!userId) return false

  const { data: userRole } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()

  let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false)

  if (userRole?.role) {
    query = query.or(`user_id.eq.${userId},recipient_role.eq.${userRole.role}`)
  }

  const { error } = await query

  if (error) return false

  await logAuditAction('Notifications Marked All Read', 'notification', null, 'All notifications marked as read')
  return true
}

export async function deleteNotification(notificationId: string) {
  const { data: notification, error: fetchError } = await supabase.from('notifications').select('*').eq('id', notificationId).single()

  if (fetchError) return false

  const { error } = await supabase.from('notifications').delete().eq('id', notificationId)

  if (error) return false

  await logAuditAction('Notification Deleted', 'notification', notificationId, `Deleted: ${notification.title}`)
  return true
}

export async function createHostAlert(
  hostUserId: string,
  visitorName: string,
  visitorOrganization: string | null,
  purpose: string,
  officeLocation: string | null
) {
  const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return createNotification(
    'Visitor Arrived',
    `${visitorName} from ${visitorOrganization || '—'} has arrived for ${purpose} at ${arrivalTime} in ${officeLocation || '—'}.`,
    'visitor',
    hostUserId,
    null,
    'visit',
    undefined
  )
}

export async function createDocumentUploadedNotification(
  visitorName: string,
  documentType: string,
  uploadedBy: string
) {
  return createNotification(
    'Document Uploaded',
    `${documentType} uploaded for visitor ${visitorName} by ${uploadedBy}.`,
    'info',
    null,
    'Admin',
    'visitor_document',
    undefined
  )
}

export async function createDocumentVerifiedNotification(
  visitorName: string,
  documentType: string,
  verifiedBy: string
) {
  return createNotification(
    'Document Verified',
    `${documentType} for visitor ${visitorName} verified by ${verifiedBy}.`,
    'success',
    null,
    'Admin',
    'visitor_document',
    undefined
  )
}

export async function createVerificationFailedNotification(
  visitorName: string,
  documentType: string,
  reason: string
) {
  return createNotification(
    'Verification Failed',
    `${documentType} for visitor ${visitorName} failed verification: ${reason}.`,
    'error',
    null,
    'Admin',
    'visitor_document',
    undefined
  )
}

export async function createWatchlistMatchNotification(
  visitorName: string,
  category: string,
  reason: string | null
) {
  return createNotification(
    'Watchlist Match',
    `Visitor ${visitorName} matches watchlist entry: ${category}. ${reason || ''}`,
    'watchlist_match',
    null,
    'Admin',
    'visitor_watchlist',
    undefined
  )
}

export async function createWatchlistAddedNotification(
  entryName: string,
  category: string,
  addedBy: string
) {
  return createNotification(
    'Watchlist Entry Added',
    `New watchlist entry for ${entryName} (${category}) added by ${addedBy}.`,
    'watchlist_added',
    null,
    'Admin',
    'visitor_watchlist',
    undefined
  )
}

export async function createWatchlistUpdatedNotification(
  entryName: string,
  category: string,
  updatedBy: string
) {
  return createNotification(
    'Watchlist Entry Updated',
    `Watchlist entry for ${entryName} (${category}) updated by ${updatedBy}.`,
    'watchlist_updated',
    null,
    'Admin',
    'visitor_watchlist',
    undefined
  )
}

export async function createWatchlistOverrideNotification(
  visitorName: string,
  approvedBy: string
) {
  return createNotification(
    'Watchlist Override Approved',
    `Registration override approved for ${visitorName} by ${approvedBy}.`,
    'watchlist_override',
    null,
    'Admin',
    'visitor_watchlist',
    undefined
  )
}
