import { supabase } from './supabase'

export type UserRole = 'Admin' | 'Receptionist' | 'Security' | 'Host Employee'

export interface UserWithRole {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string | null
}

export const PERMISSIONS: Record<UserRole, string[]> = {
  Admin: [
    'dashboard',
    'visitors',
    'visits',
    'employees',
    'reports',
    'audit-logs',
    'scanner',
    'settings',
    'users',
    'delete-records',
    'appointments',
    'export-reports',
    'emergency',
    'vehicles',
  ],
  Receptionist: [
    'dashboard',
    'visitors',
    'visits',
    'scanner',
    'check-in',
    'check-out',
    'appointments',
    'vehicles',
  ],
  Security: [
    'dashboard',
    'scanner',
    'emergency',
    'vehicles',
  ],
  'Host Employee': [
    'dashboard',
    'view-visitors',
    'view-today-visits',
    'view-visit-history',
    'appointments',
  ],
}

export async function getCurrentUser(): Promise<UserWithRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userRole, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !userRole) {
    return {
      id: user.id,
      email: user.email || '',
      full_name: null,
      role: 'Receptionist' as UserRole,
      created_at: null,
    }
  }

  return {
    id: user.id,
    email: user.email || '',
    full_name: userRole.full_name,
    role: userRole.role as UserRole,
    created_at: userRole.created_at,
  }
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const user = await getCurrentUser()
  return user?.role || 'Receptionist'
}

export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return PERMISSIONS[user.role]?.includes(permission) || false
}

export async function requireRole(allowedRoles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return allowedRoles.includes(user.role)
}

export async function ensureUserInDatabase(userId: string, email: string, fullName: string | null = null): Promise<void> {
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      email: email,
      full_name: fullName,
      role: 'Receptionist' as UserRole,
    })

    if (!error) {
      await logAuditAction('User Created', 'user', userId, `New user auto-assigned Receptionist role`)
    }
  }
}

async function logAuditAction(action: string, entityType: string, entityId: string | null, details: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      performed_by: user?.email || 'anonymous',
      details,
    })

    if (error) console.error('Audit log error:', error)
  } catch (err) {
    console.error('Failed to log audit action:', err)
  }
}