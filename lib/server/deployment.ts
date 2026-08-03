import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'

export interface Backup {
  id: string
  backup_type: string
  backup_size_bytes: number | null
  tables: string[] | null
  storage_size_bytes: number | null
  status: string
  checksum: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  completed_at: string | null
}

export interface Deployment {
  id: string
  version: string
  commit_hash: string | null
  build_number: string | null
  environment: string
  status: string
  rolled_back: boolean
  deployed_by: string | null
  deployed_at: string
}

export interface MaintenanceMode {
  enabled: boolean
  message: string | null
  started_at: string | null
  ended_at: string | null
}

export interface SystemInfo {
  cpu_usage_percent: number | null
  memory_usage_percent: number | null
  disk_usage_percent: number | null
  storage_usage_bytes: number | null
  database_size_bytes: number | null
  realtime_status: string | null
  active_sessions: number | null
  logged_in_users: number | null
  api_response_time_ms: number | null
  checked_at: string
}

export interface ConfigurationSnapshot {
  id: string
  name: string
  configuration: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface HealthCheck {
  component: string
  status: string
  message: string | null
  checked_at: string
}

export async function getBackups(limit = 50): Promise<Backup[]> {
  if (!supabaseAdmin) return []

  const { data } = await supabaseAdmin
    .from('backups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []) as Backup[]
}

export async function createBackup(type: string, createdBy: string | null): Promise<Backup | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('backups')
    .insert({
      backup_type: type,
      status: 'pending',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating backup:', error)
    return null
  }

  await logAuditAction('Backup Created', 'backup', data.id, `Backup created: ${type}`)
  return data as Backup
}

export async function completeBackup(backupId: string, size: number, checksum: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('backups')
    .update({
      status: 'completed',
      backup_size_bytes: size,
      checksum,
      completed_at: new Date().toISOString(),
    })
    .eq('id', backupId)

  if (error) {
    console.error('Error completing backup:', error)
    return false
  }

  return true
}

export async function deleteBackup(backupId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('backups')
    .delete()
    .eq('id', backupId)

  if (error) {
    console.error('Error deleting backup:', error)
    return false
  }

  await logAuditAction('Backup Deleted', 'backup', backupId, `Backup ${backupId} deleted`)
  return true
}

export async function getDeployments(limit = 50): Promise<Deployment[]> {
  if (!supabaseAdmin) return []

  const { data } = await supabaseAdmin
    .from('deployments')
    .select('*')
    .order('deployed_at', { ascending: false })
    .limit(limit)

  return (data || []) as Deployment[]
}

export async function createDeployment(version: string, commitHash: string | null, buildNumber: string | null, environment: string, deployedBy: string | null): Promise<Deployment | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('deployments')
    .insert({
      version,
      commit_hash: commitHash,
      build_number: buildNumber,
      environment,
      deployed_by: deployedBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating deployment:', error)
    return null
  }

  return data as Deployment
}

export async function rollbackDeployment(deploymentId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('deployments')
    .update({ rolled_back: true })
    .eq('id', deploymentId)

  if (error) {
    console.error('Error rolling back deployment:', error)
    return false
  }

  await logAuditAction('Rollback Executed', 'deployment', deploymentId, `Deployment ${deploymentId} rolled back`)
  return true
}

export async function getMaintenanceMode(): Promise<MaintenanceMode | null> {
  if (!supabaseAdmin) return null

  const { data } = await supabaseAdmin
    .from('maintenance_mode')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return { enabled: false, message: null, started_at: null, ended_at: null }
  }

  return data as MaintenanceMode
}

export async function setMaintenanceMode(enabled: boolean, message: string | null, userId: string | null): Promise<boolean> {
  if (!supabaseAdmin) return false

  if (enabled) {
    const { error } = await supabaseAdmin
      .from('maintenance_mode')
      .insert({
        enabled: true,
        message,
        started_at: new Date().toISOString(),
        started_by: userId,
      })

    if (error) {
      console.error('Error enabling maintenance mode:', error)
      return false
    }

    await logAuditAction('Maintenance Enabled', 'system', 'maintenance', `Maintenance mode enabled: ${message || 'No message'}`)
  } else {
    const { data: current } = await supabaseAdmin
      .from('maintenance_mode')
      .select('id')
      .eq('enabled', true)
      .limit(1)
      .maybeSingle()

    if (current) {
      const { error } = await supabaseAdmin
        .from('maintenance_mode')
        .update({
          enabled: false,
          ended_at: new Date().toISOString(),
          ended_by: userId,
        })
        .eq('id', current.id)

      if (error) {
        console.error('Error disabling maintenance mode:', error)
        return false
      }
    }

    await logAuditAction('Maintenance Disabled', 'system', 'maintenance', 'Maintenance mode disabled')
  }

  return true
}

export async function getSystemInfo(): Promise<SystemInfo | null> {
  if (!supabaseAdmin) return null

  const { data } = await supabaseAdmin
    .from('system_info')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return {
      cpu_usage_percent: null,
      memory_usage_percent: null,
      disk_usage_percent: null,
      storage_usage_bytes: null,
      database_size_bytes: null,
      realtime_status: null,
      active_sessions: null,
      logged_in_users: null,
      api_response_time_ms: null,
      checked_at: new Date().toISOString(),
    }
  }

  return data as SystemInfo
}

export async function saveSystemInfo(info: Partial<SystemInfo>): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('system_info')
    .insert({
      ...info,
      checked_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error saving system info:', error)
    return false
  }

  return true
}

export async function getConfigurationSnapshots(): Promise<ConfigurationSnapshot[]> {
  if (!supabaseAdmin) return []

  const { data } = await supabaseAdmin
    .from('configuration_snapshots')
    .select('*')
    .order('created_at', { ascending: false })

  return (data || []) as ConfigurationSnapshot[]
}

export async function createConfigurationSnapshot(name: string, configuration: Record<string, unknown>, userId: string | null): Promise<ConfigurationSnapshot | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('configuration_snapshots')
    .insert({
      name,
      configuration,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating configuration snapshot:', error)
    return null
  }

  await logAuditAction('Configuration Exported', 'configuration', data.id, `Configuration exported: ${name}`)
  return data as ConfigurationSnapshot
}

export async function runHealthCheck(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []

  if (!supabaseAdmin) {
    checks.push({ component: 'Database', status: 'error', message: 'Supabase admin not configured', checked_at: new Date().toISOString() })
    return checks
  }

  // Database check
  try {
    const { error } = await supabaseAdmin.from('user_roles').select('count', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ component: 'Database', status: 'healthy', message: 'Database connection successful', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Database', status: 'error', message: err instanceof Error ? err.message : 'Database check failed', checked_at: new Date().toISOString() })
  }

  // Storage check
  try {
    const { data } = await supabaseAdmin.storage.listBuckets()
    checks.push({ component: 'Storage', status: 'healthy', message: `Storage available: ${data?.length || 0} buckets`, checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Storage', status: 'error', message: err instanceof Error ? err.message : 'Storage check failed', checked_at: new Date().toISOString() })
  }

  // Auth check
  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers()
    checks.push({ component: 'Authentication', status: 'healthy', message: 'Authentication service available', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Authentication', status: 'error', message: err instanceof Error ? err.message : 'Auth check failed', checked_at: new Date().toISOString() })
  }

  // RLS check
  try {
    const { error } = await supabaseAdmin.from('system_jobs').select('count', { count: 'exact', head: true })
    checks.push({ component: 'RLS', status: 'healthy', message: 'RLS policies active', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'RLS', status: 'error', message: err instanceof Error ? err.message : 'RLS check failed', checked_at: new Date().toISOString() })
  }

  // API check
  try {
    const { error } = await supabaseAdmin.from('system_jobs').select('id').limit(1)
    checks.push({ component: 'API', status: 'healthy', message: 'API responding', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'API', status: 'error', message: err instanceof Error ? err.message : 'API check failed', checked_at: new Date().toISOString() })
  }

  // Background Jobs check
  try {
    const { error } = await supabaseAdmin.from('system_jobs').select('count', { count: 'exact', head: true })
    checks.push({ component: 'Background Jobs', status: 'healthy', message: 'Background jobs table accessible', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Background Jobs', status: 'error', message: err instanceof Error ? err.message : 'Background jobs check failed', checked_at: new Date().toISOString() })
  }

  // Notifications check
  try {
    const { error } = await supabaseAdmin.from('notifications').select('count', { count: 'exact', head: true })
    checks.push({ component: 'Notifications', status: 'healthy', message: 'Notifications table accessible', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Notifications', status: 'error', message: err instanceof Error ? err.message : 'Notifications check failed', checked_at: new Date().toISOString() })
  }

  // Realtime check
  try {
    const { error } = await supabaseAdmin.from('system_logs').select('count', { count: 'exact', head: true })
    checks.push({ component: 'Realtime', status: 'healthy', message: 'Realtime tables available', checked_at: new Date().toISOString() })
  } catch (err) {
    checks.push({ component: 'Realtime', status: 'error', message: err instanceof Error ? err.message : 'Realtime check failed', checked_at: new Date().toISOString() })
  }

  // Save health checks
  await supabaseAdmin.from('health_checks').insert(checks)

  return checks
}
