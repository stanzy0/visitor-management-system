import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'

export interface SystemKpis {
  databaseStatus: string
  supabaseConnection: string
  authStatus: string
  storageUsage: string
  activeVisitors: number
  activeAppointments: number
  activeBadges: number
  activeNotifications: number
  pendingDocumentReviews: number
  pendingOnlineRegistrations: number
  securityAlerts: number
  runningBackgroundJobs: number
}

export interface DatabaseHealth {
  tableSizes: Array<{ table_name: string; row_count: number; size_bytes: bigint }>
  slowestTables: Array<{ table_name: string; avg_query_time_ms: number }>
  lastBackup: string | null
  lastMigration: string | null
  activeConnections: number
}

export interface BackgroundJob {
  id: string
  job_name: string
  job_type: string
  status: string
  last_run: string | null
  last_duration_ms: number | null
  next_run: string | null
  records_processed: number | null
  error_message: string | null
}

export interface StorageBucket {
  id: string
  bucket_name: string
  file_count: number
  total_size_bytes: bigint
  largest_file_bytes: bigint | null
  oldest_file_at: string | null
  newest_file_at: string | null
}

export interface PerformanceMetric {
  id: string
  metric_name: string
  metric_type: string
  value_ms: number
  metadata: Record<string, any>
  created_at: string
}

export interface SystemError {
  id: string
  error_type: string
  module: string
  severity: string
  message: string
  stack_trace: string | null
  user_email: string | null
  ip_address: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface SystemLog {
  id: string
  module: string
  severity: string
  action: string
  description: string
  user_email: string | null
  ip_address: string | null
  resolved: boolean
  created_at: string
}

export interface SystemHealthScore {
  score: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  components: {
    database: number
    storage: number
    backgroundJobs: number
    apiResponse: number
    errorCount: number
    realtimeConnectivity: number
  }
}

export async function getSystemKpis(): Promise<SystemKpis> {
  if (!supabaseAdmin) {
    return {
      databaseStatus: 'unknown',
      supabaseConnection: 'unknown',
      authStatus: 'unknown',
      storageUsage: 'unknown',
      activeVisitors: 0,
      activeAppointments: 0,
      activeBadges: 0,
      activeNotifications: 0,
      pendingDocumentReviews: 0,
      pendingOnlineRegistrations: 0,
      securityAlerts: 0,
      runningBackgroundJobs: 0,
    }
  }

  const [
    activeVisitorsRes,
    activeAppointmentsRes,
    activeBadgesRes,
    activeNotificationsRes,
    pendingDocRes,
    pendingRegRes,
    alertsRes,
    jobsRes,
  ] = await Promise.all([
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
    supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'Scheduled'),
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact', head: true }).eq('badge_status', 'Active'),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabaseAdmin.from('document_verifications').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('source', 'public').eq('status', 'pending'),
    supabaseAdmin.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    supabaseAdmin.from('system_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running'),
  ])

  return {
    databaseStatus: 'healthy',
    supabaseConnection: 'connected',
    authStatus: 'healthy',
    storageUsage: '0 MB',
    activeVisitors: activeVisitorsRes.count || 0,
    activeAppointments: activeAppointmentsRes.count || 0,
    activeBadges: activeBadgesRes.count || 0,
    activeNotifications: activeNotificationsRes.count || 0,
    pendingDocumentReviews: pendingDocRes.count || 0,
    pendingOnlineRegistrations: pendingRegRes.count || 0,
    securityAlerts: alertsRes.count || 0,
    runningBackgroundJobs: jobsRes.count || 0,
  }
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  if (!supabaseAdmin) {
    return {
      tableSizes: [],
      slowestTables: [],
      lastBackup: null,
      lastMigration: null,
      activeConnections: 0,
    }
  }

  const { data: tablesData, error } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .not('table_name', 'like', 'pg_%')

  if (error || !tablesData) {
    return {
      tableSizes: [],
      slowestTables: [],
      lastBackup: null,
      lastMigration: null,
      activeConnections: 0,
    }
  }

  const tableData: Array<{ table_name: string; row_count: number; size_bytes: bigint }> = []

  for (const table of tablesData) {
    const { count } = await supabaseAdmin.from(table.table_name).select('id', { count: 'exact', head: true })
    tableData.push({
      table_name: table.table_name,
      row_count: count || 0,
      size_bytes: BigInt(0),
    })
  }

  const { data: lastBackup } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'last_backup')
    .maybeSingle()

  const { data: lastMigration } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'last_migration')
    .maybeSingle()

  return {
    tableSizes: tableData.sort((a, b) => Number(b.size_bytes) - Number(a.size_bytes)).slice(0, 20),
    slowestTables: [],
    lastBackup: lastBackup?.value || null,
    lastMigration: lastMigration?.value || null,
    activeConnections: 0,
  }
}

export async function getBackgroundJobs(): Promise<BackgroundJob[]> {
  if (!supabaseAdmin) {
    return []
  }

  const { data } = await supabaseAdmin
    .from('system_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  return (data || []) as BackgroundJob[]
}

export async function getStorageMonitoring(): Promise<StorageBucket[]> {
  if (!supabaseAdmin) {
    return []
  }

  const { data } = await supabaseAdmin
    .from('storage_monitoring')
    .select('*')
    .order('checked_at', { ascending: false })

  return (data || []) as StorageBucket[]
}

export async function getPerformanceMetrics(metricName?: string): Promise<PerformanceMetric[]> {
  if (!supabaseAdmin) {
    return []
  }

  let query = supabaseAdmin
    .from('performance_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (metricName) {
    query = query.eq('metric_name', metricName)
  }

  const { data } = await query

  return (data || []) as PerformanceMetric[]
}

export async function getSystemErrors(resolved?: boolean): Promise<SystemError[]> {
  if (!supabaseAdmin) {
    return []
  }

  let query = supabaseAdmin
    .from('error_tracking')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved)
  }

  const { data } = await query

  return (data || []) as SystemError[]
}

export async function getSystemLogs(filters: {
  module?: string
  severity?: string
  user_email?: string
  date_from?: string
  date_to?: string
  action?: string
  limit?: number
}): Promise<SystemLog[]> {
  if (!supabaseAdmin) {
    return []
  }

  let query = supabaseAdmin
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit || 100)

  if (filters.module) {
    query = query.eq('module', filters.module)
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters.user_email) {
    query = query.eq('user_email', filters.user_email)
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }
  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`)
  }

  const { data } = await query

  return (data || []) as SystemLog[]
}

export async function getSystemHealthScore(): Promise<SystemHealthScore> {
  if (!supabaseAdmin) {
    return {
      score: 0,
      status: 'critical',
      components: {
        database: 0,
        storage: 0,
        backgroundJobs: 0,
        apiResponse: 0,
        errorCount: 0,
        realtimeConnectivity: 0,
      },
    }
  }

  const kpis = await getSystemKpis()
  const errors = await getSystemErrors(false)
  const jobs = await getBackgroundJobs()

  const errorCount = errors.length
  const failedJobs = jobs.filter(j => j.status === 'failed').length

  const dbScore = kpis.databaseStatus === 'healthy' ? 100 : 0
  const storageScore = 100
  const jobsScore = failedJobs === 0 ? 100 : Math.max(0, 100 - failedJobs * 10)
  const apiScore = 100
  const errorScore = errorCount === 0 ? 100 : Math.max(0, 100 - errorCount * 5)
  const realtimeScore = kpis.supabaseConnection === 'connected' ? 100 : 0

  const components = {
    database: dbScore,
    storage: storageScore,
    backgroundJobs: jobsScore,
    apiResponse: apiScore,
    errorCount: errorScore,
    realtimeConnectivity: realtimeScore,
  }

  const score = Math.round(
    (components.database + components.storage + components.backgroundJobs + components.apiResponse + components.errorCount + components.realtimeConnectivity) / 6
  )

  let status: SystemHealthScore['status'] = 'excellent'
  if (score < 50) status = 'critical'
  else if (score < 70) status = 'warning'
  else if (score < 90) status = 'good'

  return { score, status, components }
}

export async function markErrorResolved(errorId: string, userId: string | null): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('error_tracking')
    .update({ resolved: true, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', errorId)

  if (error) {
    console.error('Error marking error as resolved:', error)
    return false
  }

  await logAuditAction('Error Resolved', 'error', errorId, `Error ${errorId} marked as resolved`)
  return true
}

export async function runJobNow(jobName: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  const { error } = await supabaseAdmin
    .from('system_jobs')
    .update({ status: 'running', last_run: new Date().toISOString() })
    .eq('job_name', jobName)

  if (error) {
    console.error('Error running job:', error)
    return false
  }

  await logAuditAction('Job Run', 'system_job', jobName, `Manual run triggered for job ${jobName}`)
  return true
}

export async function deleteOrphanedFiles(bucketName: string): Promise<number> {
  if (!supabaseAdmin) return 0

  const { data: files } = await supabaseAdmin.storage.from(bucketName).list()

  if (!files) return 0

  const { data: visits } = await supabaseAdmin
    .from('visits')
    .select('id')
    .eq('status', 'checked_out')

  const activeVisitIds = new Set((visits || []).map((v: any) => v.id))

  let deleted = 0
  for (const file of files) {
    const visitId = file.name.split('_')[0]
    if (!activeVisitIds.has(visitId)) {
      await supabaseAdmin.storage.from(bucketName).remove([file.name])
      deleted++
    }
  }

  await logAuditAction('Orphaned Files Deleted', 'storage', bucketName, `Deleted ${deleted} orphaned files from ${bucketName}`)
  return deleted
}
