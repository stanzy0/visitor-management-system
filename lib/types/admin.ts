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
}

export interface SystemHealth {
  databaseStatus: string
  realtimeStatus: string
  emailStatus: string
  storageUsage: string
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
