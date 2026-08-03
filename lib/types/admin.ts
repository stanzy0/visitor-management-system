export interface AdminDashboardStats {
  totalUsers: number
  activeUsers: number
  lockedAccounts: number
  receptionists: number
  securityOfficers: number
  hostEmployees: number
  administrators: number
  visitorsToday: number
  activeVisits: number
  pendingRegistrations: number
  overstayedVisitors: number
  failedLogins: number
  emailQueue: number
  onlineReceptionists: number
}

export interface SystemHealth {
  databaseStatus: string
  realtimeStatus: string
  emailStatus: string
  storageUsage: string
  services: Array<{
    service: string
    status: string
    latency?: string | null
    last_checked: string
    details?: string | null
  }>
}

export interface AdminRole {
  id: string
  name: string
  description?: string | null
  permissions: string[]
  is_system_role: boolean
  created_at: string
}

export interface AdminRoleFormData {
  name: string
  description?: string
  permissions: string[]
}

export interface SystemLog {
  id: string
  level: string
  category: string
  message: string
  details?: string | null
  source?: string | null
  created_at: string
}

export interface BackupRecord {
  id: string
  filename: string
  size: string
  created_at: string
  created_by: string
  status: string
}

export interface AdminUser {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: string
  ban_duration: string | null
  must_change_password: boolean
  created_at: string | null
  employee?: {
    department: string | null
    position: string | null
    office_location: string | null
  } | null
}

export interface Department {
  id: string
  name: string
  head_name?: string | null
  building?: string | null
  is_active: boolean
  created_at: string
}

export interface Office {
  id: string
  name: string
  building: string
  department: string | null
  floor: string | null
  room: string | null
  is_active: boolean
  created_at: string
}

export interface Integration {
  id: string
  name: string
  type: 'email' | 'sms' | 'qr' | 'storage' | 'other'
  provider: string
  status: 'connected' | 'disconnected' | 'error' | 'operational' | 'configured' | 'not_configured'
  api_key?: string | null
  last_tested?: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuditLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id?: string | null
  performed_by: string
  details?: string | null
  ip_address?: string | null
  user_agent?: string | null
  status: 'success' | 'failure' | 'warning'
  created_at: string
}

export interface SystemHealthDetailed {
  service: string
  status: 'operational' | 'warning' | 'offline' | 'configured' | 'not_configured'
  latency?: string | null
  last_checked: string
  details?: string | null
}
