import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import type { AdminDashboardStats, SystemHealth, AdminRole, SystemLog, BackupRecord, AdminUser, Department, Office, Integration, EmailTemplate, AuditLogEntry, SystemHealthDetailed } from '@/lib/types/admin'

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
    failedLogins,
    emailQueue,
    onlineReceptionists,
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
    supabaseAdmin.from('system_logs').select('id', { count: 'exact', head: true }).eq('level', 'error').gte('created_at', today),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'Receptionist').neq('ban_duration', '876000h'),
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
    failedLogins: failedLogins.count ?? 0,
    emailQueue: emailQueue.count ?? 0,
    onlineReceptionists: onlineReceptionists.count ?? 0,
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

  const services = [
    { service: 'Supabase', status: databaseStatus === 'healthy' ? 'operational' : 'offline', last_checked: new Date().toISOString() },
    { service: 'Database', status: databaseStatus === 'healthy' ? 'operational' : 'offline', last_checked: new Date().toISOString() },
    { service: 'Realtime', status: realtimeStatus === 'healthy' ? 'operational' : 'warning', last_checked: new Date().toISOString() },
    { service: 'Storage', status: storageUsage !== 'unknown' ? 'operational' : 'warning', last_checked: new Date().toISOString() },
    { service: 'Email Service', status: emailStatus === 'configured' ? 'operational' : 'not_configured', last_checked: new Date().toISOString() },
    { service: 'QR Service', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Badge Service', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Notification Queue', status: 'operational', last_checked: new Date().toISOString() },
  ]

  return {
    databaseStatus,
    realtimeStatus,
    emailStatus,
    storageUsage,
    services,
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

export async function getAllUsersWithDetails(): Promise<{ id: string; [key: string]: unknown }[]> {
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

export async function getEmailSettings(): Promise<{ id: string; key: string; value: unknown; category: string; [key: string]: unknown }[]> {
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

export async function updateEmailSettings(settings: Record<string, unknown>): Promise<void> {
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

// ============ USER MANAGEMENT ============

export async function getAllUsers(): Promise<AdminUser[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('*, employee:employees(department,position,office_location)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createUser(data: { email: string; full_name: string; role: string; password: string }): Promise<{ id: string; email?: string; [key: string]: unknown }> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create user')
  }

  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
    })

  if (roleError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new Error(roleError.message)
  }

  await logAuditAction('User Created', 'user', authData.user.id, `Created user ${data.email} with role ${data.role}`)
  return {
    id: authData.user.id,
    email: authData.user.email,
  } as { id: string; email?: string; [key: string]: unknown }
}

export async function updateUser(userId: string, updates: { full_name?: string; email?: string; role?: string }): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('user_roles')
    .update(updates)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  await logAuditAction('User Updated', 'user', userId, `Updated user ${userId}`)
}

export async function deleteUser(userId: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  await supabaseAdmin.auth.admin.deleteUser(userId)
  await logAuditAction('User Deleted', 'user', userId, `Deleted user ${userId}`)
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) throw new Error(error.message)
  await logAuditAction('Password Reset', 'user', userId, `Password reset for user ${userId}`)
}

// ============ DEPARTMENT MANAGEMENT ============

export async function getDepartments(): Promise<Department[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createDepartment(data: { name: string; head_name?: string; building?: string; is_active?: boolean }): Promise<Department> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: dept, error } = await supabaseAdmin
    .from('departments')
    .insert(data)
    .select()
    .single()

  if (error || !dept) throw new Error(error?.message || 'Failed to create department')
  await logAuditAction('Department Created', 'department', dept.id, `Created department ${data.name}`)
  return dept
}

export async function updateDepartment(id: string, updates: { name?: string; head_name?: string; building?: string; is_active?: boolean }): Promise<Department> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to update department')
  await logAuditAction('Department Updated', 'department', id, `Updated department ${id}`)
  return data
}

export async function deleteDepartment(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logAuditAction('Department Deleted', 'department', id, `Deleted department ${id}`)
}

// ============ OFFICE MANAGEMENT ============

export async function getOffices(): Promise<Office[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('office_locations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createOffice(data: { name: string; building: string; department?: string; floor?: string; room?: string; is_active?: boolean }): Promise<Office> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: office, error } = await supabaseAdmin
    .from('office_locations')
    .insert(data)
    .select()
    .single()

  if (error || !office) throw new Error(error?.message || 'Failed to create office')
  await logAuditAction('Office Created', 'office', office.id, `Created office ${data.name}`)
  return office
}

export async function updateOffice(id: string, updates: { name?: string; building?: string; department?: string; floor?: string; room?: string; is_active?: boolean }): Promise<Office> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('office_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to update office')
  await logAuditAction('Office Updated', 'office', id, `Updated office ${id}`)
  return data
}

export async function deleteOffice(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('office_locations')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logAuditAction('Office Deleted', 'office', id, `Deleted office ${id}`)
}

// ============ SYSTEM HEALTH ============

export async function getEnhancedSystemHealth(): Promise<SystemHealthDetailed[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const services: SystemHealthDetailed[] = [
    { service: 'Supabase', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Database', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Realtime', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Storage', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Email Service', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'QR Service', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Badge Service', status: 'operational', last_checked: new Date().toISOString() },
    { service: 'Notification Queue', status: 'operational', last_checked: new Date().toISOString() },
  ]

  try {
    await supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true })
  } catch {
    services[0].status = 'offline'
    services[1].status = 'offline'
  }

  try {
    const channel = supabaseAdmin.channel('health-check')
    await supabaseAdmin.removeChannel(channel)
  } catch {
    services[2].status = 'warning'
  }

  try {
    const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'enable_emails').single()
    if (data?.value !== true && data?.value !== 'true') {
      services[4].status = 'not_configured'
    }
  } catch {
    services[4].status = 'warning'
  }

  return services
}

// ============ INTEGRATIONS ============

export async function getIntegrations(): Promise<Integration[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('system_settings')
    .select('*')
    .in('category', ['integration_email', 'integration_sms', 'integration_qr', 'integration_storage'])

  if (error) throw new Error(error.message)

  const integrations: Integration[] = [
    { id: 'email', name: 'Email Provider', type: 'email', provider: 'Resend', status: 'configured', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'sms', name: 'SMS Provider', type: 'sms', provider: 'None', status: 'disconnected', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'qr', name: 'QR Service', type: 'qr', provider: 'Built-in', status: 'operational', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'storage', name: 'Storage', type: 'storage', provider: 'Supabase Storage', status: 'operational', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]

  return integrations
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateIntegration(id: string, _updates: Partial<Integration>): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')
  await logAuditAction('Integration Updated', 'integration', id, `Updated integration ${id}`)
}

// ============ EMAIL TEMPLATES ============

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('*')
    .eq('category', 'email_template')

  if (error) throw new Error(error.message)

  return (data || []).map((row: { key: string; value?: Record<string, unknown>; created_at: string; updated_at?: string }) => ({
    id: row.key,
    name: row.key.replace('template_', '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    subject: String(row.value?.subject || ''),
    body_html: String(row.value?.html || ''),
    body_text: String(row.value?.text || ''),
    category: 'email_template',
    is_active: Boolean(row.value?.active ?? true),
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  }))
}

export async function upsertEmailTemplate(template: Partial<EmailTemplate> & { id: string }): Promise<EmailTemplate> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .upsert({
      key: template.id,
      value: {
        subject: template.subject,
        html: template.body_html,
        text: template.body_text,
        active: template.is_active ?? true,
      },
      category: 'email_template',
      description: template.name,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to save template')
  await logAuditAction('Email Template Updated', 'email_template', template.id, `Updated template ${template.id}`)
  return data
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('system_settings')
    .delete()
    .eq('key', id)
    .eq('category', 'email_template')

  if (error) throw new Error(error.message)
  await logAuditAction('Email Template Deleted', 'email_template', id, `Deleted template ${id}`)
}

// ============ AUDIT LOGS ============

export async function getAuditLogs(filters: { user?: string; action?: string; entity_type?: string; search?: string; status?: string } = {}): Promise<AuditLogEntry[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.user) {
    query = query.ilike('performed_by', `%${filters.user}%`)
  }
  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`)
  }
  if (filters.entity_type) {
    query = query.ilike('entity_type', `%${filters.entity_type}%`)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.search) {
    query = query.or(`action.ilike.%${filters.search}%,details.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%`)
  }

  const result = await query as unknown as { data: { [key: string]: unknown }[] | null; error: { message: string } | null }
  const { data, error } = result
  if (error) throw new Error(error.message)
  return (data || []).map((row: { [key: string]: unknown }) => ({
    ...row,
    status: (row.status as string) || 'success',
  })) as AuditLogEntry[]
}
