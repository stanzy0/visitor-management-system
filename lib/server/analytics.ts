import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AnalyticsStats {
  visitorsToday: number
  visitorsThisWeek: number
  visitorsThisMonth: number
  activeVisitors: number
  checkedIn: number
  checkedOut: number
  pendingApproval: number
  pendingDocumentVerification: number
  securityHolds: number
  rejectedVisitors: number
  noShows: number
  completedAppointments: number
  cancelledAppointments: number
  overstayedVisitors: number
  badgesPrintedToday: number
  assetsRegisteredToday: number
}

export interface VisitorTrends {
  daily: Array<{ date: string; count: number }>
  weekly: Array<{ week: string; count: number }>
  monthly: Array<{ month: string; count: number }>
  peakHours: Array<{ hour: string; count: number }>
  peakDays: Array<{ day: string; count: number }>
  avgVisitDuration: string
  avgWaitingTime: string
  avgApprovalToCheckIn: string
}

export interface HostAnalytics {
  topHosts: Array<{ name: string; visits: number; department: string }>
  topDepartments: Array<{ name: string; visits: number }>
  visitorsPerDepartment: Array<{ name: string; count: number }>
  visitorsPerOfficeLocation: Array<{ name: string; count: number }>
  topEmployees: Array<{ name: string; visits: number }>
  repeatVisitorsByHost: Array<{ host: string; repeatVisitors: number }>
}

export interface SecurityAnalytics {
  rejectedVisitors: number
  deniedEntryReasons: Array<{ reason: string; count: number }>
  watchlistMatches: number
  criticalAlerts: number
  avgGateProcessingTime: string
  securityHolds: number
  visitorExitDelays: number
}

export interface DocumentAnalytics {
  pending: number
  rejected: number
  replacementRequests: number
  avgVerificationTime: string
  verificationSuccessRate: number
}

export interface AppointmentAnalytics {
  today: number
  upcoming: number
  completed: number
  cancelled: number
  avgDuration: string
  noShowRate: number
}

export interface BadgeAnalytics {
  issued: number
  revoked: number
  expired: number
  reprinted: number
}

export interface PropertyAnalytics {
  registered: number
  confiscated: number
  released: number
  pendingRelease: number
  commonTypes: Array<{ type: string; count: number }>
}

export interface VisitorTypes {
  types: Array<{ name: string; value: number }>
}

export interface VisitorSources {
  sources: Array<{ name: string; value: number }>
}

export interface RepeatVisitors {
  visitors: Array<{ id: string; full_name: string; visitor_organization: string | null; photo_url: string | null; visits: number; lastVisit: string }>
}

function getDateRange(dateRange: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateRange) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return { start: yesterday, end: today }
    case '7days':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
    case '30days':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    default:
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
  }
}

export async function getAnalyticsStats(dateRange: string, department: string, visitorType: string, hostId: string, officeLocation: string): Promise<AnalyticsStats> {
  if (!supabaseAdmin) {
    return {
      visitorsToday: 0, visitorsThisWeek: 0, visitorsThisMonth: 0, activeVisitors: 0, checkedIn: 0, checkedOut: 0,
      pendingApproval: 0, pendingDocumentVerification: 0, securityHolds: 0, rejectedVisitors: 0, noShows: 0,
      completedAppointments: 0, cancelledAppointments: 0, overstayedVisitors: 0, badgesPrintedToday: 0, assetsRegisteredToday: 0,
    }
  }

  const { start, end } = getDateRange(dateRange)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let visitsQuery = supabaseAdmin.from('visits').select('*', { count: 'exact' }).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  if (department) visitsQuery = visitsQuery.eq('employee:departments.name', department)
  if (visitorType) visitsQuery = visitsQuery.eq('visitor:visitors.visitor_type', visitorType)
  if (hostId) visitsQuery = visitsQuery.eq('employee_id', hostId)
  if (officeLocation) visitsQuery = visitsQuery.eq('employee:employees.office_location', officeLocation)

  const [todayVisits, weekVisits, monthVisits, activeVisits, checkedInVisits, checkedOutVisits, pendingApprovalVisits, rejectedVisits, overstayedVisits, badgesToday, assetsToday] = await Promise.all([
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).gte('created_at', todayStart.toISOString()),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_out'),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'rejected'),
    supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'overstayed'),
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact' }).gte('created_at', todayStart.toISOString()),
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).gte('created_at', todayStart.toISOString()),
  ])

  return {
    visitorsToday: todayVisits.count || 0,
    visitorsThisWeek: weekVisits.count || 0,
    visitorsThisMonth: monthVisits.count || 0,
    activeVisitors: activeVisits.count || 0,
    checkedIn: checkedInVisits.count || 0,
    checkedOut: checkedOutVisits.count || 0,
    pendingApproval: pendingApprovalVisits.count || 0,
    pendingDocumentVerification: 0,
    securityHolds: 0,
    rejectedVisitors: rejectedVisits.count || 0,
    noShows: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    overstayedVisitors: overstayedVisits.count || 0,
    badgesPrintedToday: badgesToday.count || 0,
    assetsRegisteredToday: assetsToday.count || 0,
  }
}

export async function getVisitorTrends(dateRange: string): Promise<VisitorTrends> {
  if (!supabaseAdmin) {
    return {
      daily: [], weekly: [], monthly: [], peakHours: [], peakDays: [],
      avgVisitDuration: '0h 0m', avgWaitingTime: '0h 0m', avgApprovalToCheckIn: '0h 0m',
    }
  }

  const { start, end } = getDateRange(dateRange)
  const now = new Date()

  const dailyVisits = await supabaseAdmin.from('visits').select('created_at').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const monthlyVisits = await supabaseAdmin.from('visits').select('created_at').gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
  const peakHoursData = await supabaseAdmin.from('visits').select('check_in_time').not('check_in_time', 'is', null).gte('check_in_time', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const peakDaysData = await supabaseAdmin.from('visits').select('created_at').gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const durationData = await supabaseAdmin.from('visits').select('check_in_time, check_out_time').not('check_out_time', 'is', null).gte('check_in_time', start.toISOString())

  const processByDay = (data: any[]) => {
    const map = new Map<string, number>()
    data?.forEach((r: any) => {
      const d = new Date(r.created_at).toISOString().split('T')[0]
      map.set(d, (map.get(d) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([date, count]) => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const processByWeek = (data: any[]) => {
    const map = new Map<string, number>()
    data?.forEach((r: any) => {
      const d = new Date(r.created_at)
      const weekStart = new Date(d.getTime() - d.getDay() * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      map.set(weekStart, (map.get(weekStart) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([week, count]) => ({ week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }

  const processByMonth = (data: any[]) => {
    const map = new Map<string, number>()
    data?.forEach((r: any) => {
      const d = new Date(r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([month, count]) => ({ month, count }))
  }

  const processPeakHours = (data: any[]) => {
    const map = new Map<number, number>()
    data?.forEach((r: any) => {
      if (r.check_in_time) {
        const h = new Date(r.check_in_time).getHours()
        map.set(h, (map.get(h) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
  }

  const processPeakDays = (data: any[]) => {
    const map = new Map<string, number>()
    data?.forEach((r: any) => {
      const d = new Date(r.created_at)
      const day = d.toLocaleDateString('en-US', { weekday: 'short' })
      map.set(day, (map.get(day) || 0) + 1)
    })
    const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return dayOrder.map(day => ({ day, count: map.get(day) || 0 })).filter(d => d.count > 0)
  }

  const avgDuration = durationData.data?.length
    ? Math.round(durationData.data.reduce((acc: number, r: any) => {
        const start = new Date(r.check_in_time).getTime()
        const end = new Date(r.check_out_time).getTime()
        return acc + (end - start) / (1000 * 60)
      }, 0) / durationData.data.length)
    : 0

  return {
    daily: processByDay(dailyVisits.data || []),
    weekly: processByWeek(dailyVisits.data || []),
    monthly: processByMonth(monthlyVisits.data || []),
    peakHours: processPeakHours(peakHoursData.data || []),
    peakDays: processPeakDays(peakDaysData.data || []),
    avgVisitDuration: `${Math.floor(avgDuration / 60)}h ${avgDuration % 60}m`,
    avgWaitingTime: '0h 0m',
    avgApprovalToCheckIn: '0h 0m',
  }
}

export async function getHostAnalytics(dateRange: string): Promise<HostAnalytics> {
  if (!supabaseAdmin) {
    return { topHosts: [], topDepartments: [], visitorsPerDepartment: [], visitorsPerOfficeLocation: [], topEmployees: [], repeatVisitorsByHost: [] }
  }

  const { start, end } = getDateRange(dateRange)
  const visits = await supabaseAdmin.from('visits').select('employee:employees(full_name, department, office_location)').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const processByField = (data: any[], field: string) => {
    const map = new Map<string, number>()
    data?.forEach((r: any) => {
      const val = r.employee?.[field] || 'Unknown'
      map.set(val, (map.get(val) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)
  }

  return {
    topHosts: processByField(visits.data || [], 'full_name').map(item => ({ ...item, department: '' })),
    topDepartments: processByField(visits.data || [], 'department').map(item => ({ name: item.name, visits: item.visits })),
    visitorsPerDepartment: processByField(visits.data || [], 'department').map(item => ({ name: item.name, count: item.visits })),
    visitorsPerOfficeLocation: processByField(visits.data || [], 'office_location').map(item => ({ name: item.name, count: item.visits })),
    topEmployees: processByField(visits.data || [], 'full_name').map(item => ({ name: item.name, visits: item.visits })),
    repeatVisitorsByHost: [],
  }
}

export async function getSecurityAnalytics(dateRange: string): Promise<SecurityAnalytics> {
  if (!supabaseAdmin) {
    return { rejectedVisitors: 0, deniedEntryReasons: [], watchlistMatches: 0, criticalAlerts: 0, avgGateProcessingTime: '0m', securityHolds: 0, visitorExitDelays: 0 }
  }

  const { start, end } = getDateRange(dateRange)

  const rejected = await supabaseAdmin.from('visits').select('id', { count: 'exact' }).eq('status', 'rejected').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const watchlist = await supabaseAdmin.from('notifications').select('id', { count: 'exact' }).eq('type', 'watchlist_match').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const alerts = await supabaseAdmin.from('security_alerts').select('severity, alert_type').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const deniedReasons: Record<string, number> = {}
  alerts.data?.forEach((a: any) => {
    deniedReasons[a.alert_type] = (deniedReasons[a.alert_type] || 0) + 1
  })

  return {
    rejectedVisitors: rejected.count || 0,
    deniedEntryReasons: Object.entries(deniedReasons).map(([reason, count]) => ({ reason, count })),
    watchlistMatches: watchlist.count || 0,
    criticalAlerts: (alerts.data || []).filter((a: any) => a.severity === 'Critical').length,
    avgGateProcessingTime: '5m',
    securityHolds: 0,
    visitorExitDelays: 0,
  }
}

export async function getDocumentAnalytics(dateRange: string): Promise<DocumentAnalytics> {
  if (!supabaseAdmin) {
    return { pending: 0, rejected: 0, replacementRequests: 0, avgVerificationTime: '0h 0m', verificationSuccessRate: 0 }
  }

  const { start, end } = getDateRange(dateRange)

  const pending = await supabaseAdmin.from('visitor_documents').select('id', { count: 'exact' }).eq('verification_status', 'Pending').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const rejected = await supabaseAdmin.from('visitor_documents').select('id', { count: 'exact' }).eq('verification_status', 'Rejected').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const replacements = await supabaseAdmin.from('visitor_documents').select('id', { count: 'exact' }).eq('verification_status', 'Replacement Requested').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const approved = await supabaseAdmin.from('visitor_documents').select('created_at, verified_at').eq('verification_status', 'Verified').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const total = (approved.data?.length || 0) + (rejected.count || 0)
  const successRate = total > 0 ? Math.round(((approved.data?.length || 0) / total) * 100) : 0

  let avgTime = '0h 0m'
  if (approved.data && approved.data.length > 0) {
    const times = approved.data.filter((d: any) => d.verified_at).map((d: any) => new Date(d.verified_at).getTime() - new Date(d.created_at).getTime())
    if (times.length > 0) {
      const avgMs = times.reduce((a: number, b: number) => a + b, 0) / times.length
      const hours = Math.floor(avgMs / (1000 * 60 * 60))
      const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))
      avgTime = `${hours}h ${minutes}m`
    }
  }

  return {
    pending: pending.count || 0,
    rejected: rejected.count || 0,
    replacementRequests: replacements.count || 0,
    avgVerificationTime: avgTime,
    verificationSuccessRate: successRate,
  }
}

export async function getAppointmentAnalytics(dateRange: string): Promise<AppointmentAnalytics> {
  if (!supabaseAdmin) {
    return { today: 0, upcoming: 0, completed: 0, cancelled: 0, avgDuration: '0h 0m', noShowRate: 0 }
  }

  const { start, end } = getDateRange(dateRange)
  const today = new Date().toISOString().split('T')[0]

  const [todayAppts, upcomingAppts, completedAppts, cancelledAppts] = await Promise.all([
    supabaseAdmin.from('appointments').select('id', { count: 'exact' }).eq('appointment_date', today),
    supabaseAdmin.from('appointments').select('id', { count: 'exact' }).gte('appointment_date', today).in('status', ['Scheduled', 'Arrived']),
    supabaseAdmin.from('appointments').select('id', { count: 'exact' }).eq('status', 'Completed').gte('appointment_date', start.toISOString()).lt('appointment_date', end.toISOString()),
    supabaseAdmin.from('appointments').select('id', { count: 'exact' }).eq('status', 'Cancelled').gte('appointment_date', start.toISOString()).lt('appointment_date', end.toISOString()),
  ])

  return {
    today: todayAppts.count || 0,
    upcoming: upcomingAppts.count || 0,
    completed: completedAppts.count || 0,
    cancelled: cancelledAppts.count || 0,
    avgDuration: '1h 0m',
    noShowRate: 0,
  }
}

export async function getBadgeAnalytics(dateRange: string): Promise<BadgeAnalytics> {
  if (!supabaseAdmin) {
    return { issued: 0, revoked: 0, expired: 0, reprinted: 0 }
  }

  const { start, end } = getDateRange(dateRange)

  const [issued, revoked, expired, reprinted] = await Promise.all([
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact' }).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact' }).eq('badge_status', 'Revoked').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact' }).eq('badge_status', 'Expired').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('visitor_badges').select('id', { count: 'exact' }).gt('reprint_count', 0).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
  ])

  return {
    issued: issued.count || 0,
    revoked: revoked.count || 0,
    expired: expired.count || 0,
    reprinted: reprinted.count || 0,
  }
}

export async function getPropertyAnalytics(dateRange: string): Promise<PropertyAnalytics> {
  if (!supabaseAdmin) {
    return { registered: 0, confiscated: 0, released: 0, pendingRelease: 0, commonTypes: [] }
  }

  const { start, end } = getDateRange(dateRange)

  const [registered, confiscated, released, pending] = await Promise.all([
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).eq('status', 'Confiscated').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).eq('status', 'Released').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).eq('status', 'Pending Release').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
  ])

  const types = await supabaseAdmin.from('assets').select('property_type').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  const typeCounts: Record<string, number> = {}
  types.data?.forEach((a: any) => {
    const t = a.property_type || 'Other'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  })
  const commonTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  return {
    registered: registered.count || 0,
    confiscated: confiscated.count || 0,
    released: released.count || 0,
    pendingRelease: pending.count || 0,
    commonTypes,
  }
}

export async function getVisitorTypes(dateRange: string): Promise<VisitorTypes> {
  if (!supabaseAdmin) {
    return { types: [] }
  }

  const { start, end } = getDateRange(dateRange)
  const { data } = await supabaseAdmin.from('visitors').select('visitor_type').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const counts: Record<string, number> = {}
  data?.forEach((v: any) => {
    const t = v.visitor_type || 'Other'
    counts[t] = (counts[t] || 0) + 1
  })

  return {
    types: Object.entries(counts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value),
  }
}

export async function getVisitorSources(dateRange: string): Promise<VisitorSources> {
  if (!supabaseAdmin) {
    return { sources: [] }
  }

  const { start, end } = getDateRange(dateRange)
  const { data } = await supabaseAdmin.from('visits').select('source').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const counts: Record<string, number> = {}
  data?.forEach((v: any) => {
    const s = v.source || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })

  return {
    sources: Object.entries(counts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value),
  }
}

export async function getRepeatVisitors(dateRange: string): Promise<RepeatVisitors> {
  if (!supabaseAdmin) {
    return { visitors: [] }
  }

  const { start, end } = getDateRange(dateRange)
  const { data } = await supabaseAdmin.from('visits').select('visitor_id, visitor:visitors(full_name, visitor_organization, photo_url), created_at').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

  const visitorMap = new Map<string, any>()
  data?.forEach((v: any) => {
    if (!v.visitor_id) return
    const existing = visitorMap.get(v.visitor_id)
    if (existing) {
      existing.visits += 1
      if (new Date(v.created_at) > new Date(existing.lastVisit)) {
        existing.lastVisit = v.created_at
      }
    } else {
      visitorMap.set(v.visitor_id, {
        id: v.visitor_id,
        full_name: typeof v.visitor === 'object' ? v.visitor?.full_name : 'Unknown',
        visitor_organization: typeof v.visitor === 'object' ? v.visitor?.visitor_organization : null,
        photo_url: typeof v.visitor === 'object' ? v.visitor?.photo_url : null,
        visits: 1,
        lastVisit: v.created_at,
      })
    }
  })

  return {
    visitors: Array.from(visitorMap.values()).sort((a, b) => b.visits - a.visits).slice(0, 20),
  }
}
