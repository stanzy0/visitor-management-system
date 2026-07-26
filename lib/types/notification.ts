export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Critical'

export type NotificationCategory = 'Visitor' | 'Appointment' | 'Badge' | 'Security' | 'System' | 'Asset' | 'Approval'

export interface Notification {
  id: string
  user_id: string | null
  recipient_role: string | null
  title: string
  message: string
  type: string
  priority: NotificationPriority
  is_read: boolean
  action_url: string | null
  created_at: string
}

export interface NotificationFilters {
  search: string
  type: string
  priority: string
  read: string
  dateFrom: string
  dateTo: string
}

export interface NotificationPreferences {
  email: boolean
  browser: boolean
  sms: boolean
  system: boolean
  appointmentReminders: boolean
  securityAlerts: boolean
  hostNotifications: boolean
  visitorNotifications: boolean
}

export interface NotificationStats {
  total: number
  unread: number
  read: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  avgResponseTime: number | null
}
