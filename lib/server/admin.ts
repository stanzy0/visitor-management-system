import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import type { AdminDashboardStats, SystemHealth, AdminRole, SystemLog, BackupRecord } from '@/lib/types/admin'

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const today = new Date().toISOString().split('T')[0]

  const [
    totalUsers,
    activeUsers,
    lockedAccounts,
    receptionists,
    securityOfficers,
    hostEmployees,
    administrators,
    visitorsToday,
    activeVisits,
    pendingRegistrations,
    overstayedVisitors,
  ] = await Promise.all([
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).neq('ban_duration', '876000h'),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('ban_duration', '876000h'),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'Receptionist'),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'Security'),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'Host Employee'),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'Admin'),
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', today),
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in').lt('check_in_time', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()),
  ])

  return {
    totalUsers: totalUsers.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    lockedAccounts: lockedAccounts.count ?? 0,
    receptionists: receptionists.count ?? 0,
    securityOfficers: securityOfficers.count ?? 0,
    hostEmployees: hostEmployees.count ?? 0,
    administrators: administrators.count ?? 0,
    visitorsToday: visitorsToday.count ?? 0,
    activeVisits: activeVisits.count ?? 0,
    pendingRegistrations: pendingRegistrations.count ?? 0,
    overstayedVisitors: overstayedVisitors.count ?? 0,
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  let databaseStatus = 'healthy'
  let realtimeStatus = 'healthy'
  let emailStatus = 'not_configured'
  let storageUsage = '0 MB'

  try {
    await supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true })
  } catch {
    databaseStatus = 'error'
  }

  try {
    const channel = supabaseAdmin.channel('health-check')
    await supabaseAdmin.removeChannel(channel)
  } catch {
    realtimeStatus = 'error'
  }

  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'enable_emails')
      .single()

    if (data?.value === true || data?.value === 'true') {
      emailStatus = 'configured'
    }
  } catch {
    emailStatus = 'not_configured'
  }

  try {
    const { data } = await supabaseAdmin.storage.from('visitor-photos').list('', { limit: 1 })
    if (data) {
      storageUsage = `${(data.length * 0.5).toFixed(1)} MB`
    }
  } catch {
    storageUsage = 'unknown'
  }

  return {
    databaseStatus,
    realtimeStatus,
    emailStatus,
    storageUsage,
  }
}

export async function getAdminRoles(): Promise<AdminRole[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createAdminRole(role: { name: string; description?: string; permissions: string[] }): Promise<AdminRole> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('roles')
    .insert({
      name: role.name,
      description: role.description || null,
      permissions: role.permissions,
      is_system_role: false,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create role')
  }

  await logAuditAction('Role Created', 'role', data.id, `Created role ${role.name}`)

  return data
}

export async function updateAdminRole(id: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<AdminRole> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('roles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update role')
  }

  await logAuditAction('Role Updated', 'role', id, `Updated role ${id}`)

  return data
}

export async function deleteAdminRole(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('roles')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  await logAuditAction('Role Deleted', 'role', id, `Deleted role ${id}`)
}

export async function getSystemLogs(filters: { level?: string; category?: string; search?: string } = {}): Promise<SystemLog[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  let query = supabaseAdmin
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.level) {
    query = query.eq('level', filters.level)
  }

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  if (filters.search) {
    query = query.or(`message.ilike.%${filters.search}%,details.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('backups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createBackupRecord(record: { filename: string; size: string; status: string }): Promise<BackupRecord> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const user = await supabase.auth.getUser()
  const createdBy = user.data.user?.email || 'admin'

  const { data, error } = await supabaseAdmin
    .from('backups')
    .insert({
      ...record,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create backup')
  }

  await logAuditAction('Backup Created', 'backup', data.id, `Backup ${record.filename} created`)

  return data
}

export async function getAllUsersWithDetails(): Promise<any[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('*, employee:employees(*)')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function updateUserStatus(userId: string, updates: { ban_duration?: string; must_change_password?: boolean }): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('user_roles')
    .update(updates)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  const action = updates.ban_duration === '876000h' ? 'User Disabled' : 'User Enabled'
  await logAuditAction(action, 'user', userId, `${action} by admin`)
}

export async function sendTestEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Test Email from Admin Portal',
        html: '<p>This is a test email from the AFCSC Visitor Management System Admin Portal.</p>',
        text: 'This is a test email from the AFCSC Visitor Management System Admin Portal.',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, message: data.error || 'Failed to send test email' }
    }

    await logAuditAction('Email Test Sent', 'email', null, `Test email sent to ${email}`)
    return { success: true, message: 'Test email sent successfully' }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Failed to send test email' }
  }
}

export async function getEmailSettings(): Promise<any> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('*')
    .in('key', ['resend_api_status', 'sender_name', 'sender_email', 'reply_to_email', 'enable_emails', 'enable_appointment_emails', 'enable_reminder_emails', 'enable_emergency_emails'])

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function updateEmailSettings(settings: Record<string, any>): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const entries = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    category: 'email',
  }))

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert(entries, { onConflict: 'key' })

  if (error) {
    throw new Error(error.message)
  }

  await logAuditAction('Email Settings Updated', 'system_settings', null, 'Email configuration updated')
}
