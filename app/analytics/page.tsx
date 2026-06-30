'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  Users,
  Clock,
  Calendar,
  FileText,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Download,
  Printer,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface AnalyticsData {
  visitorsToday: number
  visitorsThisWeek: number
  visitorsThisMonth: number
  avgVisitDuration: string
  pendingAppointments: number
  pendingDocVerification: number
  watchlistHits: number
  visitorsOnSite: number
  visitorsByDay: Array<{ date: string; count: number }>
  visitorsByMonth: Array<{ month: string; count: number }>
  peakHours: Array<{ hour: string; count: number }>
  visitorsByDepartment: Array<{ name: string; count: number }>
  visitorsByHost: Array<{ name: string; count: number }>
  visitorsByOrganization: Array<{ name: string; count: number }>
  appointmentApprovalRate: number
  checkInVsWalkIn: Array<{ type: string; count: number }>
  watchlistActivity: Array<{ date: string; count: number }>
  emergencySummary: Array<{ date: string; counted: number; missing: number }>
  longestVisits: Array<{ visitor: string; duration: string; host: string }>
  afterHoursVisits: Array<{ visitor: string; time: string; host: string }>
  topVisitors: Array<{ name: string; visits: number }>
  topHosts: Array<{ name: string; visits: number }>
  topDepartments: Array<{ name: string; visits: number }>
  topOrganizations: Array<{ name: string; visits: number }>
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [exporting, setExporting] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('analytics')) {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      setAuthChecking(false)
      fetchAnalytics()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const [
        todayRes,
        weekRes,
        monthRes,
        pendingApptRes,
        pendingDocRes,
        watchlistRes,
        onSiteRes,
        avgDurationRes,
        byDayRes,
        byMonthRes,
        peakRes,
        byDeptRes,
        byHostRes,
        byOrgRes,
        approvalRes,
        checkInRes,
        watchlistActivityRes,
        emergencyRes,
        longestRes,
        afterHoursRes,
        topVisitorsRes,
        topHostsRes,
        topDeptRes,
        topOrgRes,
      ] = await Promise.all([
        supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', todayStr),
        supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', weekAgo),
        supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', monthAgo),
        supabase.from('appointments').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('visitor_documents').select('id', { count: 'exact' }).eq('verified', false),
        supabase.from('visitor_watchlist').select('id', { count: 'exact' }).eq('status', 'Active'),
        supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
        supabase.from('visits').select('check_in_time, check_out_time').not('check_out_time', 'is', null).gte('check_in_time', monthAgo),
        supabase.from('visits').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('visits').select('created_at').gte('created_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
        supabase.from('visits').select('check_in_time').not('check_in_time', 'is', null).gte('check_in_time', monthAgo),
        supabase.from('visits').select('employee:employees(department)').not('status', 'eq', 'rejected'),
        supabase.from('visits').select('employee:employees(full_name)').not('status', 'eq', 'rejected'),
        supabase.from('visits').select('visitor:visitors(visitor_organization)').not('status', 'eq', 'rejected'),
        supabase.from('appointments').select('status').gte('created_at', monthAgo),
        supabase.from('visits').select('status').not('status', 'eq', 'rejected'),
        supabase.from('notifications').select('created_at').eq('type', 'watchlist_match').gte('created_at', monthAgo),
        supabase.from('emergency_sessions').select('started_at, ended_at').gte('started_at', monthAgo),
        supabase.from('visits').select('check_in_time, check_out_time, visitor:visitors(full_name), employee:employees(full_name)').not('check_out_time', 'is', null).order('check_in_time', { ascending: true }).limit(10),
        supabase.from('visits').select('check_in_time, visitor:visitors(full_name), employee:employees(full_name)').gte('check_in_time', monthAgo).lt('check_in_time', new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()),
        supabase.from('visits').select('visitor:visitors(full_name), id').order('created_at', { ascending: false }).limit(10),
        supabase.from('visits').select('employee:employees(full_name), id').order('created_at', { ascending: false }).limit(10),
        supabase.from('visits').select('employee:employees(department), id').order('created_at', { ascending: false }).limit(10),
        supabase.from('visits').select('visitor:visitors(visitor_organization), id').order('created_at', { ascending: false }).limit(10),
      ])

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

      const processByField = (data: any[], field: string) => {
        const map = new Map<string, number>()
        data?.forEach((r: any) => {
          const val = r[field] || 'Unknown'
          if (typeof val === 'object' && val !== null) {
            const nested = Object.values(val)[0] as string
            map.set(nested || 'Unknown', (map.get(nested || 'Unknown') || 0) + 1)
          } else {
            map.set(val as string, (map.get(val as string) || 0) + 1)
          }
        })
        return Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }

      const avgDuration = avgDurationRes.data?.length
        ? Math.round(
            avgDurationRes.data.reduce((acc: number, r: any) => {
              const start = new Date(r.check_in_time).getTime()
              const end = new Date(r.check_out_time).getTime()
              return acc + (end - start) / (1000 * 60)
            }, 0) / avgDurationRes.data.length
          )
        : 0

      const appts = approvalRes.data || []
      const approvedAppts = appts.filter((a: any) => a.status === 'approved').length
      const approvalRate = appts.length > 0 ? Math.round((approvedAppts / appts.length) * 100) : 0

      const visitsForCheckIn = checkInRes.data || []
      const checkIns = visitsForCheckIn.filter((v: any) => v.status === 'checked_in').length
      const walkIns = visitsForCheckIn.filter((v: any) => v.status === 'approved').length

      const emergencyData = emergencyRes.data || []
      const emergencySummary = emergencyData.map((e: any) => {
        const counted = 0
        const missing = 0
        return {
          date: new Date(e.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          counted,
          missing,
        }
      })

      const topVisitors = topVisitorsRes.data?.reduce((acc: any[], r: any) => {
        const name = typeof r.visitor === 'object' ? r.visitor?.full_name || 'Unknown' : 'Unknown'
        const existing = acc.find((a) => a.name === name)
        if (existing) existing.visits += 1
        else acc.push({ name, visits: 1 })
        return acc
      }, []).sort((a, b) => b.visits - a.visits).slice(0, 10) || []

      const topHosts = topHostsRes.data?.reduce((acc: any[], r: any) => {
        const name = typeof r.employee === 'object' ? r.employee?.full_name || 'Unknown' : 'Unknown'
        const existing = acc.find((a) => a.name === name)
        if (existing) existing.visits += 1
        else acc.push({ name, visits: 1 })
        return acc
      }, []).sort((a, b) => b.visits - a.visits).slice(0, 10) || []

      const topDepartments = topDeptRes.data?.reduce((acc: any[], r: any) => {
        let name = 'Unknown'
        if (typeof r.employee === 'object' && r.employee?.department) {
          name = r.employee.department
        }
        const existing = acc.find((a) => a.name === name)
        if (existing) existing.visits += 1
        else acc.push({ name, visits: 1 })
        return acc
      }, []).sort((a, b) => b.visits - a.visits).slice(0, 10) || []

      const topOrganizations = topOrgRes.data?.reduce((acc: any[], r: any) => {
        const name = typeof r.visitor === 'object' ? r.visitor?.visitor_organization || 'Unknown' : 'Unknown'
        const existing = acc.find((a) => a.name === name)
        if (existing) existing.visits += 1
        else acc.push({ name, visits: 1 })
        return acc
      }, []).sort((a, b) => b.visits - a.visits).slice(0, 10) || []

      setData({
        visitorsToday: todayRes.count ?? 0,
        visitorsThisWeek: weekRes.count ?? 0,
        visitorsThisMonth: monthRes.count ?? 0,
        avgVisitDuration: `${avgDuration} min`,
        pendingAppointments: pendingApptRes.count ?? 0,
        pendingDocVerification: pendingDocRes.count ?? 0,
        watchlistHits: watchlistRes.count ?? 0,
        visitorsOnSite: onSiteRes.count ?? 0,
        visitorsByDay: processByDay(byDayRes.data ?? []),
        visitorsByMonth: processByMonth(byMonthRes.data ?? []),
        peakHours: processPeakHours(peakRes.data ?? []),
        visitorsByDepartment: processByField(byDeptRes.data ?? [], 'department'),
        visitorsByHost: processByField(byHostRes.data ?? [], 'full_name'),
        visitorsByOrganization: processByField(byOrgRes.data ?? [], 'visitor_organization'),
        appointmentApprovalRate: approvalRate,
        checkInVsWalkIn: [
          { type: 'Checked In', count: checkIns },
          { type: 'Pending/Approved', count: walkIns },
        ],
        watchlistActivity: watchlistActivityRes.data?.map((r: any) => ({
          date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 1,
        })) || [],
        emergencySummary,
        longestVisits: longestRes.data?.map((r: any) => {
          const start = new Date(r.check_in_time).getTime()
          const end = new Date(r.check_out_time).getTime()
          const mins = Math.round((end - start) / (1000 * 60))
          const visitorName = typeof r.visitor === 'object' ? r.visitor?.full_name : 'Unknown'
          const hostName = typeof r.employee === 'object' ? r.employee?.full_name : 'Unknown'
          return {
            visitor: visitorName,
            duration: `${Math.floor(mins / 60)}h ${mins % 60}m`,
            host: hostName,
          }
        }) || [],
        afterHoursVisits: afterHoursRes.data?.map((r: any) => {
          const visitorName = typeof r.visitor === 'object' ? r.visitor?.full_name : 'Unknown'
          const hostName = typeof r.employee === 'object' ? r.employee?.full_name : 'Unknown'
          return {
            visitor: visitorName,
            time: new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            host: hostName,
          }
        }) || [],
        topVisitors,
        topHosts,
        topDepartments,
        topOrganizations,
      })
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_documents' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_watchlist' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchAnalytics()
      )
      .subscribe()
  }

  const exportPDF = async () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Analytics Report', 14, 22)
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)

      if (data) {
        autoTable(doc, {
          startY: 40,
          head: [['Metric', 'Value']],
          body: [
            ['Visitors Today', data.visitorsToday.toString()],
            ['Visitors This Week', data.visitorsThisWeek.toString()],
            ['Visitors This Month', data.visitorsThisMonth.toString()],
            ['Average Visit Duration', data.avgVisitDuration],
            ['Pending Appointments', data.pendingAppointments.toString()],
            ['Pending Doc Verification', data.pendingDocVerification.toString()],
            ['Watchlist Hits', data.watchlistHits.toString()],
            ['Visitors On Site', data.visitorsOnSite.toString()],
            ['Appointment Approval Rate', `${data.appointmentApprovalRate}%`],
          ],
        })
      }
      doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportExcel = () => {
    setExporting(true)
    try {
      const ws = XLSX.utils.json_to_sheet(
        data
          ? [
              { Metric: 'Visitors Today', Value: data.visitorsToday },
              { Metric: 'Visitors This Week', Value: data.visitorsThisWeek },
              { Metric: 'Visitors This Month', Value: data.visitorsThisMonth },
              { Metric: 'Average Visit Duration', Value: data.avgVisitDuration },
              { Metric: 'Pending Appointments', Value: data.pendingAppointments },
              { Metric: 'Pending Doc Verification', Value: data.pendingDocVerification },
              { Metric: 'Watchlist Hits', Value: data.watchlistHits },
              { Metric: 'Visitors On Site', Value: data.visitorsOnSite },
              { Metric: 'Appointment Approval Rate', Value: `${data.appointmentApprovalRate}%` },
            ]
          : []
      )
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics')
      XLSX.writeFile(wb, `analytics-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('Excel export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const printReport = () => {
    window.print()
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Command Dashboard</h1>
            <p className="text-sm text-gray-500">Real-time visitor intelligence and security analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={printReport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Visitors Today" value={data.visitorsToday.toString()} icon={Users} color="blue" />
          <SummaryCard title="Visitors This Week" value={data.visitorsThisWeek.toString()} icon={Calendar} color="green" />
          <SummaryCard title="Visitors This Month" value={data.visitorsThisMonth.toString()} icon={TrendingUp} color="purple" />
          <SummaryCard title="On Site Now" value={data.visitorsOnSite.toString()} icon={Users} color="indigo" />
          <SummaryCard title="Avg Duration" value={data.avgVisitDuration} icon={Clock} color="amber" />
          <SummaryCard title="Pending Appointments" value={data.pendingAppointments.toString()} icon={Calendar} color="red" />
          <SummaryCard title="Pending Doc Verification" value={data.pendingDocVerification.toString()} icon={FileText} color="orange" />
          <SummaryCard title="Watchlist Hits" value={data.watchlistHits.toString()} icon={ShieldAlert} color="red" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Visitors by Day (Last 30 Days)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.visitorsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Visitors by Month">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.visitorsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peak Arrival Hours">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Visitors by Department">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.visitorsByDepartment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.visitorsByDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Visitors by Host">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.visitorsByHost} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Visitors by Organization">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.visitorsByOrganization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Appointment Approval Rate">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approved', value: data.appointmentApprovalRate },
                    { name: 'Other', value: 100 - data.appointmentApprovalRate },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Check-in vs Walk-in">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.checkInVsWalkIn}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.checkInVsWalkIn.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Security Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Security Analytics</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Watchlist Activity</h4>
                  {data.watchlistActivity.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.watchlistActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No watchlist activity</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Emergency Roll Call Summary</h4>
                  {data.emergencySummary.length > 0 ? (
                    <div className="space-y-2">
                      {data.emergencySummary.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{e.date}</span>
                          <span className="text-sm text-gray-900">Counted: {e.counted} | Missing: {e.missing}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No emergency sessions</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Longest Active Visits</h4>
                  {data.longestVisits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 font-semibold text-gray-700">Visitor</th>
                            <th className="px-3 py-2 font-semibold text-gray-700">Host</th>
                            <th className="px-3 py-2 font-semibold text-gray-700">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.longestVisits.map((v, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-600">{v.visitor}</td>
                              <td className="px-3 py-2 text-gray-600">{v.host}</td>
                              <td className="px-3 py-2 text-gray-600">{v.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No completed visits</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">After-Hours Visitors</h4>
                  {data.afterHoursVisits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 font-semibold text-gray-700">Visitor</th>
                            <th className="px-3 py-2 font-semibold text-gray-700">Host</th>
                            <th className="px-3 py-2 font-semibold text-gray-700">Check-in</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.afterHoursVisits.map((v, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-600">{v.visitor}</td>
                              <td className="px-3 py-2 text-gray-600">{v.host}</td>
                              <td className="px-3 py-2 text-gray-600">{v.time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No after-hours visits</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Visitor Intelligence</h3>
            </div>
            <div className="p-4 space-y-4">
              <TopList title="Top 10 Visitors" items={data.topVisitors} />
              <TopList title="Top 10 Hosts" items={data.topHosts} />
              <TopList title="Top 10 Departments" items={data.topDepartments} />
              <TopList title="Top 10 Organizations" items={data.topOrganizations} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color] || 'bg-gray-50 text-gray-600'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function TopList({ title, items }: { title: string; items: Array<{ name: string; visits: number }> }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-900">{item.name}</span>
              <span className="text-sm font-medium text-gray-600">{item.visits}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No data</p>
      )}
    </div>
  )
}
