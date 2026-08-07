export type NotificationCategory = 'Visitor' | 'Appointment' | 'Badge' | 'Security' | 'System' | 'Asset' | 'Approval' | 'Employee' | 'Watchlist' | 'Document'

export interface Notification {
  id: string
  user_id: string | null
  recipient_role: string | null
  title: string
  message: string
  type: string
  icon?: string | null
  related_type: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationFilters {
  search: string
  type: string
  read: string
  dateFrom: string
  dateTo: string
  page: number
  limit: number
  sortOrder: 'newest' | 'oldest'
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
  avgResponseTime: number | null
}