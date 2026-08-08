'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'custom'

export interface DashboardFilters {
  range: DateRange
  customFrom?: string
  customTo?: string
  department?: string
  host?: string
  company?: string
}

export interface DashboardStats {
  visitorsToday: number
  visitorsThisWeek: number
  visitorsThisMonth: number
  visitorsCurrentlyInside: number
  pendingApprovals: number
  checkedIn: number
  checkedOut: number
  activeBadges: number
  cancelledBadges: number
  expiredBadges: number
  registeredEmployees: number
  officeLocations: number
  auditEventsToday: number
  yesterdayTotal: number
  visitorsTrend: number
  badgesGenerated: number
  badgesPrinted: number
  badgesReprinted: number
  documentsUploadedToday: number
  pendingVerification: number
  verifiedDocuments: number
  rejectedDocuments: number
  missingDocuments: number
  visitorsWaitingVerification: number
  visitorsWaitingBadge: number
  visitorsWaitingSecurity: number
  visitorsOverstayed: number
  appointmentsToday: number
  completedAppointments: number
  cancelledAppointments: number
}

export interface ActivityItem {
  id: string
  action: string
  details: string
  created_at: string
  entity_type?: string
}

export interface ChartDataPoint {
  name: string
  count: number
  value?: number
}

export interface SecurityAlert {
  type: 'overstayed' | 'expired_visit' | 'missing_checkout' | 'cancelled_badge_active'
  label: string
  count: number
  severity: 'critical' | 'warning' | 'info'
}

function getStartEnd(range: DateRange, customFrom?: string, customTo?: string): { start: Date; end: Date } {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case 'today':
      return { start: todayStart, end: now }
    case 'yesterday': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 1)
      return { start, end: todayStart }
    }
    case '7days':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
    case '30days':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case 'custom':
    default:
      return {
        start: customFrom ? new Date(customFrom) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: customTo ? new Date(customTo) : now,
      }
  }
}

export function useDashboardData(filters: DashboardFilters, enabled = true) {
  const [stats, setStats] = useState<DashboardStats>({
    visitorsToday: 0,
    visitorsThisWeek: 0,
    visitorsThisMonth: 0,
    visitorsCurrentlyInside: 0,
    pendingApprovals: 0,
    checkedIn: 0,
    checkedOut: 0,
    activeBadges: 0,
    cancelledBadges: 0,
    expiredBadges: 0,
    registeredEmployees: 0,
    officeLocations: 0,
    auditEventsToday: 0,
    yesterdayTotal: 0,
    visitorsTrend: 0,
    badgesGenerated: 0,
    badgesPrinted: 0,
    badgesReprinted: 0,
    documentsUploadedToday: 0,
    pendingVerification: 0,
    verifiedDocuments: 0,
    rejectedDocuments: 0,
    missingDocuments: 0,
    visitorsWaitingVerification: 0,
    visitorsWaitingBadge: 0,
    visitorsWaitingSecurity: 0,
    visitorsOverstayed: 0,
    appointmentsToday: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
  })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [visitorsByDay, setVisitorsByDay] = useState<ChartDataPoint[]>([])
  const [visitorsByMonth, setVisitorsByMonth] = useState<ChartDataPoint[]>([])
  const [visitorsByDepartment, setVisitorsByDepartment] = useState<ChartDataPoint[]>([])
  const [visitorsByHost, setVisitorsByHost] = useState<ChartDataPoint[]>([])
  const [visitorsByCompany, setVisitorsByCompany] = useState<ChartDataPoint[]>([])
  const [visitorsByPurpose, setVisitorsByPurpose] = useState<ChartDataPoint[]>([])
  const [badgeStatusDistribution, setBadgeStatusDistribution] = useState<ChartDataPoint[]>([])
  const [employeesByDepartment, setEmployeesByDepartment] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      getStartEnd(filters.range, filters.customFrom, filters.customTo)
      const todayStr = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        todayVisitorsRes,
        weekVisitorsRes,
        monthVisitorsRes,
        onSiteRes,
        pendingRes,
        checkedInRes,
        checkedOutRes,
        activeBadgesRes,
        cancelledBadgesRes,
        expiredBadgesRes,
        employeesRes,
        officesRes,
        auditTodayRes,
        yesterdayVisitorsRes,
        badgesGeneratedRes,
        badgesPrintedRes,
        badgesReprintedRes,
        byDayRes,
        byMonthRes,
        byDeptRes,
        byHostRes,
        byOrgRes,
        byPurposeRes,
        badgeStatusRes,
        empByDeptRes,
        overstayedRes,
        expiredVisitsRes,
        missingCheckoutRes,
        cancelledBadgeActiveRes,
        activityRes,
        docsTodayRes,
        pendingVerificationRes,
        verifiedDocumentsRes,
        rejectedDocumentsRes,
        visitorsWaitingVerificationRes,
        visitorsWaitingBadgeRes,
        visitorsWaitingSecurityRes,
        visitorsOverstayedRes,
        appointmentsTodayRes,
        completedAppointmentsRes,
        cancelledAppointmentsRes,
      ] = await Promise.all([
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_out'),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).eq('badge_status', 'Active'),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).eq('badge_status', 'Cancelled'),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).eq('badge_status', 'Expired'),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('office_locations').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', todayStr),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).not('printed_at', 'is', null).gte('printed_at', todayStr),
        supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).gte('reprint_count', 1).gte('updated_at', todayStr),
        supabase.from('visits').select('created_at').gte('created_at', monthAgo).order('created_at', { ascending: true }),
        supabase.from('visits').select('created_at').gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString()),
        supabase.from('visits').select('employee:employees(department)').gte('created_at', monthAgo).neq('status', 'rejected'),
        supabase.from('visits').select('employee:employees(full_name)').gte('created_at', monthAgo).neq('status', 'rejected'),
        supabase.from('visits').select('visitor:visitors(visitor_organization)').gte('created_at', monthAgo).neq('status', 'rejected'),
        supabase.from('visits').select('purpose').gte('created_at', monthAgo).neq('status', 'rejected'),
        supabase.from('visitor_badges').select('badge_status').gte('created_at', monthAgo),
        supabase.from('employees').select('department').eq('status', 'active'),
        supabase.from('visits').select('id, check_in_time').eq('status', 'checked_in').lt('check_in_time', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()),
        supabase.from('visits').select('id, check_in_time').eq('status', 'checked_in').lt('expires_at', new Date().toISOString()),
        supabase.from('visits').select('id').eq('status', 'checked_out').is('check_out_time', null),
        supabase.from('visitor_badges').select('id, badge_status').eq('badge_status', 'Cancelled'),
        supabase.from('audit_logs').select('action, details, created_at, entity_type').order('created_at', { ascending: false }).limit(20),
        supabase.from('visitor_documents').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('visitor_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'Pending'),
        supabase.from('visitor_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified'),
        supabase.from('visitor_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'Rejected'),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', todayStr),
        (async () => {
          const { data: visits } = await supabase.from('visits').select('id').in('status', ['approved', 'documents_verified'])
          const visitIds = (visits || []).map((v: { id: string }) => v.id)
          const { count } = await supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).in('visit_id', visitIds)
          return { count: ((visits || []).length) - (count || 0) }
        })(),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'badge_issued'),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'overstayed'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', todayStr),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', todayStr).eq('status', 'Completed'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', todayStr).eq('status', 'Cancelled'),
      ])

      const missingDocsRes = await (async () => {
        const { data: docVisitorIds } = await supabase
          .from('visitor_documents')
          .select('visitor_id')
          .not('visitor_id', 'is', null)

         const uniqueVisitorIds = [...new Set((docVisitorIds || []).map((d: { visitor_id: string }) => d.visitor_id).filter(Boolean))]

         if (uniqueVisitorIds.length === 0) {
          const { count } = await supabase
            .from('visitors')
            .select('id', { count: 'exact', head: true })
          return { count }
        }

         const postgrestFilter = `(${uniqueVisitorIds.join(',')})`

         const { count } = await supabase
          .from('visitors')
          .select('id', { count: 'exact', head: true })
          .not('id', 'in', postgrestFilter)

        return { count }
      })()

      const yesterdayTotal = yesterdayVisitorsRes.count ?? 0
      const visitorsTrend = yesterdayTotal > 0 ? ((todayVisitorsRes.count ?? 0) - yesterdayTotal) / yesterdayTotal : 0

      setStats({
        visitorsToday: todayVisitorsRes.count ?? 0,
        visitorsThisWeek: weekVisitorsRes.count ?? 0,
        visitorsThisMonth: monthVisitorsRes.count ?? 0,
        visitorsCurrentlyInside: onSiteRes.count ?? 0,
        pendingApprovals: pendingRes.count ?? 0,
        checkedIn: checkedInRes.count ?? 0,
        checkedOut: checkedOutRes.count ?? 0,
        activeBadges: activeBadgesRes.count ?? 0,
        cancelledBadges: cancelledBadgesRes.count ?? 0,
        expiredBadges: expiredBadgesRes.count ?? 0,
        registeredEmployees: employeesRes.count ?? 0,
        officeLocations: officesRes.count ?? 0,
        auditEventsToday: auditTodayRes.count ?? 0,
        yesterdayTotal,
        visitorsTrend,
        badgesGenerated: badgesGeneratedRes.count ?? 0,
        badgesPrinted: badgesPrintedRes.count ?? 0,
        badgesReprinted: badgesReprintedRes.count ?? 0,
        documentsUploadedToday: docsTodayRes.count ?? 0,
        pendingVerification: pendingVerificationRes.count ?? 0,
        verifiedDocuments: verifiedDocumentsRes.count ?? 0,
        rejectedDocuments: rejectedDocumentsRes.count ?? 0,
        missingDocuments: missingDocsRes.count ?? 0,
        visitorsWaitingVerification: visitorsWaitingVerificationRes.count ?? 0,
        visitorsWaitingBadge: visitorsWaitingBadgeRes.count ?? 0,
        visitorsWaitingSecurity: visitorsWaitingSecurityRes.count ?? 0,
        visitorsOverstayed: visitorsOverstayedRes.count ?? 0,
        appointmentsToday: appointmentsTodayRes.count ?? 0,
        completedAppointments: completedAppointmentsRes.count ?? 0,
        cancelledAppointments: cancelledAppointmentsRes.count ?? 0,
      })

        const processByDay = (data: { created_at: string | null | undefined }[] | undefined) => {
          const map = new Map<string, number>()
          data?.forEach((r) => {
            if (!r.created_at) return
            const d = new Date(r.created_at).toISOString().split('T')[0]
            map.set(d, (map.get(d) || 0) + 1)
          })
          return Array.from(map.entries())
            .map(([date, count]) => ({ name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count }))
            .sort((a, b) => a.name.localeCompare(b.name))
        }

        const processByMonth = (data: { created_at: string | null | undefined }[] | undefined) => {
          const map = new Map<string, number>()
          data?.forEach((r) => {
            if (!r.created_at) return
            const d = new Date(r.created_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            map.set(key, (map.get(key) || 0) + 1)
          })
          return Array.from(map.entries())
            .map(([month, count]) => ({ name: month, count }))
        }

      const processField = (data: Record<string, unknown>[] | undefined, field: string) => {
        const map = new Map<string, number>()
        data?.forEach((r) => {
          const val = typeof r[field] === 'object' && r[field] !== null ? Object.values(r[field])[0] : r[field]
          const key = val || 'Unknown'
          map.set(key as string, (map.get(key as string) || 0) + 1)
        })
        return Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }

      setVisitorsByDay(processByDay(byDayRes.data || []))
      setVisitorsByMonth(processByMonth(byMonthRes.data || []))
      setVisitorsByDepartment(processField(byDeptRes.data || [], 'department'))
      setVisitorsByHost(processField(byHostRes.data || [], 'full_name'))
      setVisitorsByCompany(processField(byOrgRes.data || [], 'visitor_organization'))
      setVisitorsByPurpose(processField(byPurposeRes.data || [], 'purpose'))

      const badgeStatusMap = new Map<string, number>()
      badgeStatusRes.data?.forEach((r) => {
        const status = r.badge_status || 'Unknown'
        badgeStatusMap.set(status, (badgeStatusMap.get(status) || 0) + 1)
      })
      setBadgeStatusDistribution(Array.from(badgeStatusMap.entries()).map(([name, count]) => ({ name, count })))

      const empDeptMap = new Map<string, number>()
      empByDeptRes.data?.forEach((r) => {
        const dept = r.department || 'Unknown'
        empDeptMap.set(dept, (empDeptMap.get(dept) || 0) + 1)
      })
      setEmployeesByDepartment(Array.from(empDeptMap.entries()).map(([name, count]) => ({ name, count })))

      const alerts: SecurityAlert[] = []
      if ((overstayedRes.count ?? 0) > 0) alerts.push({ type: 'overstayed', label: 'Overstayed Visitors', count: overstayedRes.count ?? 0, severity: 'critical' })
      if ((expiredVisitsRes.count ?? 0) > 0) alerts.push({ type: 'expired_visit', label: 'Expired Visits', count: expiredVisitsRes.count ?? 0, severity: 'warning' })
      if ((missingCheckoutRes.count ?? 0) > 0) alerts.push({ type: 'missing_checkout', label: 'Missing Check-Out', count: missingCheckoutRes.count ?? 0, severity: 'critical' })
      if ((cancelledBadgeActiveRes.count ?? 0) > 0) alerts.push({ type: 'cancelled_badge_active', label: 'Cancelled Badges Still Active', count: cancelledBadgeActiveRes.count ?? 0, severity: 'warning' })
      setSecurityAlerts(alerts)

      setActivity(
        (activityRes.data || []).map((r) => ({
          id: `${r.created_at}-${r.action}`,
          action: r.action,
          details: r.details,
          created_at: r.created_at,
          entity_type: r.entity_type,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [filters])

  const fetchAllRef = useRef(fetchAll)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchAllRef.current = fetchAll
  }, [fetchAll])

  const silentRefresh = useCallback(async () => {
    setError(null)
    try {
      await fetchAllRef.current(true)
    } catch {
      // ignore realtime refresh errors
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchAllRef.current()
  }, [filters, enabled])

  useEffect(() => {
    if (!enabled) return

    const debouncedRefresh = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        silentRefresh()
      }, 300)
    }

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_badges' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_documents' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, debouncedRefresh)
      .subscribe()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [enabled, silentRefresh])

  const trendLabel = useMemo(() => {
    if (stats.visitorsTrend > 0) return `+${(stats.visitorsTrend * 100).toFixed(0)}%`
    if (stats.visitorsTrend < 0) return `${(stats.visitorsTrend * 100).toFixed(0)}%`
    return '0%'
  }, [stats.visitorsTrend])

  return { stats, activity, securityAlerts, visitorsByDay, visitorsByMonth, visitorsByDepartment, visitorsByHost, visitorsByCompany, visitorsByPurpose, badgeStatusDistribution, employeesByDepartment, loading, error, trendLabel, refetch: fetchAll }
}
