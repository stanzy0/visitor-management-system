import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import { createNotification } from '@/lib/server/notification-service'
import type { Incident, IncidentFormData, IncidentTimelineEntry, IncidentFilters, IncidentStats, IncidentReport } from '@/lib/types/incident'

export async function getIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  if (!supabaseAdmin) return []

  let query = supabaseAdmin
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.search) {
    const search = filters.search
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,incident_number.ilike.%${search}%`)
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters.severity && filters.severity !== 'all') {
    query = query.eq('severity', filters.severity)
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch incidents:', error)
    return []
  }

  return (data || []) as Incident[]
}

export async function getIncident(id: string): Promise<Incident | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Incident
}

export async function createIncident(data: IncidentFormData, reportedBy: string): Promise<Incident> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: incident, error } = await supabaseAdmin
    .from('incidents')
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      status: data.status || 'Open',
      visitor_id: data.visitor_id || null,
      visit_id: data.visit_id || null,
      employee_id: data.employee_id || null,
      reported_by: reportedBy,
      assigned_to: data.assigned_to || null,
      location: data.location || null,
      resolution: data.resolution || null,
      metadata: data.metadata || {},
    })
    .select('*')
    .single()

  if (error || !incident) {
    throw new Error(error?.message || 'Failed to create incident')
  }

  await addIncidentTimelineEntry(incident.id, 'created', `Incident created: ${data.title}`, reportedBy)

  await logAuditAction('Incident Created', 'incident', incident.id, `Incident ${incident.incident_number} created: ${data.title}`)

  if (data.assigned_to) {
    await createNotification(
      `Incident Assigned: ${incident.incident_number}`,
      `You have been assigned to incident ${incident.incident_number}: ${data.title}`,
      'info',
      data.assigned_to,
      null,
      'incident',
      incident.id
    )
  }

  return incident as Incident
}

export async function updateIncident(id: string, updates: Partial<IncidentFormData>, performedBy: string | null = null): Promise<Incident> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: incident, error } = await supabaseAdmin
    .from('incidents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !incident) {
    throw new Error(error?.message || 'Failed to update incident')
  }

  if (updates.status === 'Resolved') {
    await supabaseAdmin
      .from('incidents')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id)
  }

  await logAuditAction('Incident Updated', 'incident', id, `Incident ${incident.incident_number} updated`)

  return incident as Incident
}

export async function addIncidentTimelineEntry(
  incidentId: string,
  action: IncidentTimelineEntry['action'],
  description: string,
  performedBy: string | null,
  metadata: Record<string, unknown> = {}
): Promise<IncidentTimelineEntry> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: entry, error } = await supabaseAdmin
    .from('incident_timeline')
    .insert({
      incident_id: incidentId,
      action,
      description,
      performed_by: performedBy,
      metadata,
    })
    .select('*')
    .single()

  if (error || !entry) {
    throw new Error(error?.message || 'Failed to create timeline entry')
  }

  await logAuditAction('Incident Timeline Entry Added', 'incident_timeline', entry.id, `Timeline entry added for incident ${incidentId}: ${action}`)

  return entry as IncidentTimelineEntry
}

export async function getIncidentTimeline(incidentId: string): Promise<IncidentTimelineEntry[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('incident_timeline')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch incident timeline:', error)
    return []
  }

  return (data || []) as IncidentTimelineEntry[]
}

export async function getIncidentStats(): Promise<IncidentStats> {
  if (!supabaseAdmin) {
    return { open: 0, critical: 0, resolvedToday: 0, averageResolutionMinutes: null }
  }

  const today = new Date().toISOString().split('T')[0]

  const [openRes, criticalRes, resolvedTodayRes, allResolved] = await Promise.all([
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'Open'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('severity', 'Critical').neq('status', 'Closed'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'Resolved').gte('resolved_at', `${today}T00:00:00`),
    supabaseAdmin.from('incidents').select('created_at, resolved_at').eq('status', 'Resolved'),
  ])

  const resolved = (allResolved.data || []) as Array<{ created_at: string; resolved_at: string | null }>
  const durations = resolved
    .filter((r) => r.resolved_at)
    .map((r) => (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 60000)

  return {
    open: openRes.count ?? 0,
    critical: criticalRes.count ?? 0,
    resolvedToday: resolvedTodayRes.count ?? 0,
    averageResolutionMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
  }
}

export async function getIncidentReport(dateRange?: { start: string; end: string }): Promise<IncidentReport> {
  if (!supabaseAdmin) {
    return {
      total: 0,
      open: 0,
      assigned: 0,
      investigating: 0,
      resolved: 0,
      closed: 0,
      byCategory: {},
      bySeverity: {},
      byStatus: {},
      averageResolutionMinutes: null,
      topOfficers: [],
      trends: [],
    }
  }

  let query = supabaseAdmin.from('incidents').select('*')

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start)
  }

  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end)
  }

  const { data: incidents } = await query

  const all = (incidents || []) as Incident[]

  const byCategory: Record<string, number> = {}
  const bySeverity: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const officerCounts: Record<string, number> = {}
  const dateCounts: Record<string, number> = {}

  all.forEach((incident) => {
    byCategory[incident.category] = (byCategory[incident.category] || 0) + 1
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1

    if (incident.assigned_to) {
      officerCounts[incident.assigned_to] = (officerCounts[incident.assigned_to] || 0) + 1
    }

    const date = incident.created_at.split('T')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  const resolved = all.filter((i) => i.status === 'Resolved' && i.resolved_at)
  const durations = resolved.map((r) => (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 60000)

  const topOfficers = Object.entries(officerCounts)
    .map(([assigned_to, count]) => ({ assigned_to, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const trends = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total: all.length,
    open: all.filter((i) => i.status === 'Open').length,
    assigned: all.filter((i) => i.status === 'Assigned').length,
    investigating: all.filter((i) => i.status === 'Investigating').length,
    resolved: all.filter((i) => i.status === 'Resolved').length,
    closed: all.filter((i) => i.status === 'Closed').length,
    byCategory,
    bySeverity,
    byStatus,
    averageResolutionMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    topOfficers,
    trends,
  }
}
