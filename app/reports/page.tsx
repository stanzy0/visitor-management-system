'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { logAuditAction } from '@/lib/client/audit'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: { full_name: string; visitor_organization: string } | null
  employee: { full_name: string; department: string } | null
}

interface Visitor {
  id: string
  full_name: string
  visitor_organization: string
  created_at: string
}

interface Stats {
  totalVisitors: number
  totalVisits: number
  approvedVisits: number
  pendingVisits: number
  rejectedVisits: number
  checkedInVisits: number
  checkedOutVisits: number
  avgVisitDuration: string
  activeVisitors: number
  pendingVerification: number
  visitorsWaitingBadge: number
  visitorsOverstayed: number
  documentsReviewed: number
  documentsPending: number
  documentsRejected: number
  avgReviewTime: string
}

const FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
]

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const selectClasses = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function ReportsPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [stats, setStats] = useState<Stats>({
    totalVisitors: 0,
    totalVisits: 0,
    approvedVisits: 0,
    pendingVisits: 0,
    rejectedVisits: 0,
    checkedInVisits: 0,
    checkedOutVisits: 0,
    avgVisitDuration: '0h 0m',
    activeVisitors: 0,
    pendingVerification: 0,
    visitorsWaitingBadge: 0,
    visitorsOverstayed: 0,
    documentsReviewed: 0,
    documentsPending: 0,
    documentsRejected: 0,
    avgReviewTime: '0h 0m',
  })
  const [visitorsPerDay, setVisitorsPerDay] = useState<Array<{ date: string; count: number }>>([])
  const [visitsByStatus, setVisitsByStatus] = useState<Array<{ name: string; value: number }>>([])
  const [departmentsData, setDepartmentsData] = useState<Array<{ name: string; count: number }>>([])
  const [hostEmployeesData, setHostEmployeesData] = useState<Array<{ name: string; count: number }>>([])
  const [companiesData, setCompaniesData] = useState<Array<{ name: string; count: number }>>([])
  const [hourlyData, setHourlyData] = useState<Array<{ hour: string; count: number }>>([])
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [appointmentStats, setAppointmentStats] = useState({ total: 0, completed: 0, noShows: 0, completionRate: 0 })
  const [appointmentsByDepartment, setAppointmentsByDepartment] = useState<Array<{ name: string; count: number }>>([])
  const [exporting, setExporting] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const getDateRange = () => {
    const now = new Date()
    let start: Date, end: Date = now

    switch (dateFilter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        end = now
        break
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        end = now
        break
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        start = new Date(0)
        end = now
    }

    if (customDateFrom && customDateTo) {
      return { start: new Date(customDateFrom), end: new Date(customDateTo) }
    }

    return { start, end }
  }

  const calculateAvgDuration = (visits: Array<{ check_in_time: string | null; check_out_time: string | null }>) => {
    const completed = visits.filter(v => v.check_in_time && v.check_out_time)
    if (completed.length === 0) return '0h 0m'

    const totalMs = completed.reduce((sum, v) => {
      const inTime = new Date(v.check_in_time!).getTime()
      const outTime = new Date(v.check_out_time!).getTime()
      return sum + (outTime - inTime)
    }, 0)

    const avgMs = totalMs / completed.length
    const hours = Math.floor(avgMs / (1000 * 60 * 60))
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  const fetchStats = async (start: Date, end: Date) => {
    const [visitorsRes, visitsRes, pendingRes, approvedRes, rejectedRes, checkedOutRes, pendingVerificationRes, visitorsWaitingBadgeRes, visitorsOverstayedRes, documentsReviewedRes, documentsPendingRes, documentsRejectedRes] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact' }),
      supabase.from('visits').select('id,status,check_in_time,check_out_time', { count: 'exact' }).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'pending').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'approved').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'rejected').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_out').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visitor_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'Pending').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      (async () => {
        const { data: visits } = await supabase.from('visits').select('id').in('status', ['approved', 'documents_verified']).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
        const visitIds = (visits || []).map((v: { id: string }) => v.id)
        const { count } = await supabase.from('visitor_badges').select('id', { count: 'exact', head: true }).in('visit_id', visitIds)
        return { count: ((visits || []).length) - (count || 0) }
      })(),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'overstayed').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('document_verifications').select('id,created_at,approved_at', { count: 'exact', head: true }).eq('status', 'Approved').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('document_verifications').select('id', { count: 'exact', head: true }).eq('status', 'Pending').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('document_verifications').select('id', { count: 'exact', head: true }).eq('status', 'Rejected').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    ])

    const checkedInVisits = (visitsRes.data || []).filter((v) => v.status === 'checked_in') as Visit[]
    const avgDuration = calculateAvgDuration(checkedInVisits)

    let avgReviewTime = '0h 0m'
    if (documentsReviewedRes.data) {
      const reviewTimes = documentsReviewedRes.data
        .filter((d: any) => d.approved_at)
        .map((d: any) => new Date(d.approved_at).getTime() - new Date(d.created_at).getTime())
      if (reviewTimes.length > 0) {
        const avgMs = reviewTimes.reduce((sum: number, t: number) => sum + t, 0) / reviewTimes.length
        const hours = Math.floor(avgMs / (1000 * 60 * 60))
        const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))
        avgReviewTime = `${hours}h ${minutes}m`
      }
    }

    setStats({
      totalVisitors: visitorsRes.count ?? 0,
      totalVisits: visitsRes.count ?? 0,
      approvedVisits: approvedRes.count ?? 0,
      pendingVisits: pendingRes.count ?? 0,
      rejectedVisits: rejectedRes.count ?? 0,
      checkedInVisits: checkedInVisits.length,
      checkedOutVisits: checkedOutRes.count ?? 0,
      avgVisitDuration: avgDuration,
      activeVisitors: checkedInVisits.length,
      pendingVerification: pendingVerificationRes.count ?? 0,
      visitorsWaitingBadge: visitorsWaitingBadgeRes.count ?? 0,
      visitorsOverstayed: visitorsOverstayedRes.count ?? 0,
      documentsReviewed: documentsReviewedRes.count ?? 0,
      documentsPending: documentsPendingRes.count ?? 0,
      documentsRejected: documentsRejectedRes.count ?? 0,
      avgReviewTime,
    })
  }

  const fetchVisitorsPerDay = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('visits')
      .select('created_at')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    const dailyCounts: Record<string, number> = {}
    data?.forEach(v => {
      const date = new Date(v.created_at).toISOString().split('T')[0]
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    })

    const chartData = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setVisitorsPerDay(chartData)
  }

  const fetchVisitsByStatus = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('visits')
      .select('status')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    const statusCounts: Record<string, number> = {}
    data?.forEach(v => {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1
    })

    const chartData = [
      { name: 'Pending', value: statusCounts.pending || 0 },
      { name: 'Approved', value: statusCounts.approved || 0 },
      { name: 'Rejected', value: statusCounts.rejected || 0 },
      { name: 'Checked In', value: statusCounts.checked_in || 0 },
      { name: 'Checked Out', value: statusCounts.checked_out || 0 },
    ]

    setVisitsByStatus(chartData)
  }

  const fetchDepartmentsData = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('visits')
      .select('employee:employees(department)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()) as { data: Array<{ employee?: { department?: string } }> | null }

    const deptCounts: Record<string, number> = {}
    data?.forEach(v => {
      const dept = v.employee?.department || 'Unknown'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })

    setDepartmentsData(Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))
  }

  const fetchHostEmployeesData = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('visits')
      .select('employee:employees(full_name)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()) as { data: Array<{ employee?: { full_name?: string } }> | null }

    const hostCounts: Record<string, number> = {}
    data?.forEach(v => {
      const name = v.employee?.full_name || 'Unknown'
      hostCounts[name] = (hostCounts[name] || 0) + 1
    })

    setHostEmployeesData(Object.entries(hostCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))
  }

  const fetchCompaniesData = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('visits')
      .select('visitor:visitors(visitor_organization)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()) as { data: Array<{ visitor?: { visitor_organization?: string } }> | null }

    const orgCounts: Record<string, number> = {}
    data?.forEach(v => {
      const org = v.visitor?.visitor_organization || 'Unknown'
      orgCounts[org] = (orgCounts[org] || 0) + 1
    })

    setCompaniesData(Object.entries(orgCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))
  }

  const fetchHourlyData = async () => {
    const { data } = await supabase
      .from('visits')
      .select('check_in_time')
      .eq('status', 'checked_in')

    const hourlyCounts: Record<string, number> = {}
    for (let i = 0; i < 24; i++) hourlyCounts[`${i}:00`] = 0

    data?.forEach(v => {
      if (v.check_in_time) {
        const hour = new Date(v.check_in_time).getHours()
        hourlyCounts[`${hour}:00`] = (hourlyCounts[`${hour}:00`] || 0) + 1
      }
    })

    setHourlyData(Object.entries(hourlyCounts).map(([hour, count]) => ({ hour, count })))
  }

  const fetchAppointmentStats = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from('appointments')
      .select('status, employee:employees(department)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()) as { data: Array<{ status: string; employee?: { department?: string } }> | null }

    const total = data?.length || 0
    const completed = data?.filter(a => a.status === 'Completed').length || 0
    const noShows = data?.filter(a => a.status === 'No Show').length || 0
    const completionRate = total > 0 ? (completed / total) * 100 : 0

    setAppointmentStats({ total, completed, noShows, completionRate })

    const deptCounts: Record<string, number> = {}
    data?.forEach(a => {
      const dept = a.employee?.department || 'Unknown'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })
    setAppointmentsByDepartment(Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))
  }

  const fetchRecentVisits = async () => {
    const { data } = await supabase
      .from('visits')
      .select('*, visitor:visitors(full_name, visitor_organization), employee:employees(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentVisits(data || [])
  }

  const fetchAllData = async () => {
    setLoading(true)
    const { start, end } = getDateRange()

    try {
      await Promise.all([
        fetchStats(start, end),
        fetchVisitorsPerDay(start, end),
        fetchVisitsByStatus(start, end),
        fetchDepartmentsData(start, end),
        fetchHostEmployeesData(start, end),
        fetchCompaniesData(start, end),
        fetchHourlyData(),
        fetchRecentVisits(),
        fetchAppointmentStats(start, end),
      ])
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAllData())
      .subscribe()
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('reports')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      logAuditAction('Analytics Viewed', 'report', null, 'User viewed analytics dashboard')
      fetchAllData()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!authChecking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAllData()
    }
  }, [dateFilter, customDateFrom, customDateTo, authChecking])

  const [notificationStats, setNotificationStats] = useState({ total: 0, unread: 0, read: 0, byType: {} as Record<string, number>, byPriority: {} as Record<string, number>, avgResponseTime: null as number | null })
  const [notificationByTypeData, setNotificationByTypeData] = useState<Array<{ name: string; value: number }>>([])
  const [notificationByPriorityData, setNotificationByPriorityData] = useState<Array<{ name: string; value: number }>>([])

  useEffect(() => {
    fetchNotificationStats()
  }, [dateFilter, customDateFrom, customDateTo])

  const fetchNotificationStats = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFilter === 'custom' && customDateFrom) params.set('dateFrom', customDateFrom)
      if (dateFilter === 'custom' && customDateTo) params.set('dateTo', customDateTo)
      const res = await fetch(`/api/notifications?${params.toString()}`)
      const json = await res.json()
      if (res.ok && json.stats) {
        setNotificationStats(json.stats)
        const typeData = Object.entries(json.stats.byType || {}).map(([name, value]) => ({ name, value: value as number }))
        setNotificationByTypeData(typeData)
        const priorityData = Object.entries(json.stats.byPriority || {}).map(([name, value]) => ({ name, value: value as number }))
        setNotificationByPriorityData(priorityData)
      }
    } catch (error) {
      console.error('Failed to fetch notification stats:', error)
    }
  }

  const exportNotificationData = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(true)
    try {
      if (format === 'csv') {
        const headers = ['Type', 'Priority', 'Count']
        const rows = [
          headers.join(','),
          ...notificationByTypeData.map(d => [d.name, '—', d.value].join(',')),
          ...notificationByPriorityData.map(d => ['—', d.name, d.value].join(',')),
        ]
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notification-report-${dateFilter}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'pdf') {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text('Notification Report', 14, 22)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
        doc.text(`Period: ${dateFilter}`, 14, 40)
        autoTable(doc, {
          startY: 50,
          head: [['Metric', 'Value']],
          body: [
            ['Total Notifications', notificationStats.total.toString()],
            ['Unread', notificationStats.unread.toString()],
            ['Read', notificationStats.read.toString()],
          ],
        })
        doc.save(`notification-report-${dateFilter}.pdf`)
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6']

  const exportData = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(true)
    logAuditAction('Report Exported', 'report', null, `Report exported in ${format.toUpperCase()} format`)

    try {
      if (format === 'csv') {
        const headers = ['Visitor', 'Visitor Organization', 'Host', 'Purpose', 'Status', 'Check-In', 'Check-Out']
        const csvContent = [
          headers.join(','),
          ...recentVisits.map(v => [
            v.visitor?.full_name || '',
            v.visitor?.visitor_organization || '',
            v.employee?.full_name || '',
            v.purpose || '',
            v.status,
            v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '',
            v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '',
          ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `visits-report-${dateFilter}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(
          recentVisits.map(v => ({
            'Visitor': v.visitor?.full_name || '',
            'Visitor Organization': v.visitor?.visitor_organization || '',
            'Host': v.employee?.full_name || '',
            'Purpose': v.purpose || '',
            'Status': v.status,
            'Check-In': v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '',
            'Check-Out': v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '',
          }))
        )
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Visits')
        XLSX.writeFile(workbook, `visits-report-${dateFilter}.xlsx`)
      } else if (format === 'pdf') {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text('Visits Report', 14, 22)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
        doc.text(`Period: ${dateFilter}`, 14, 40)

        autoTable(doc, {
          startY: 50,
          head: [['Visitor', 'Visitor Organization', 'Host', 'Purpose', 'Status', 'Check-In', 'Check-Out']],
          body: recentVisits.map(v => [
            v.visitor?.full_name || '',
            v.visitor?.visitor_organization || '',
            v.employee?.full_name || '',
            v.purpose || '',
            v.status,
            v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '',
            v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '',
          ]),
        })

        doc.save(`visits-report-${dateFilter}.pdf`)
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const statusColors = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    rejected: '#ef4444',
    checked_in: '#10b981',
    checked_out: '#6b7280',
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={selectClasses}
            >
              {FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <button
              onClick={() => exportData('csv')}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportData('excel')}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={() => exportData('pdf')}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard title="Total Visitors" value={loading ? '—' : stats.totalVisitors.toString()} />
          <KpiCard title="Total Visits" value={loading ? '—' : stats.totalVisits.toString()} />
          <KpiCard title="Approved" value={loading ? '—' : stats.approvedVisits.toString()} trend="up" />
          <KpiCard title="Pending" value={loading ? '—' : stats.pendingVisits.toString()} trend="neutral" />
          <KpiCard title="Rejected" value={loading ? '—' : stats.rejectedVisits.toString()} trend="down" />
          <KpiCard title="Checked In" value={loading ? '—' : stats.checkedInVisits.toString()} trend="up" />
          <KpiCard title="Checked Out" value={loading ? '—' : stats.checkedOutVisits.toString()} trend="down" />
          <KpiCard title="Avg Duration" value={loading ? '—' : stats.avgVisitDuration} />
          <KpiCard title="Active Inside" value={loading ? '—' : stats.activeVisitors.toString()} trend="up" />
          <KpiCard title="Appointments" value={loading ? '—' : appointmentStats.total.toString()} />
          <KpiCard title="Appt Completed" value={loading ? '—' : appointmentStats.completed.toString()} trend="up" />
          <KpiCard title="No Shows" value={loading ? '—' : appointmentStats.noShows.toString()} trend="down" />
          <KpiCard title="Completion Rate" value={loading ? '—' : `${appointmentStats.completionRate.toFixed(1)}%`} />
          <KpiCard title="Waiting Verification" value={loading ? '—' : stats.pendingVerification.toString()} trend="neutral" />
          <KpiCard title="Waiting Badge" value={loading ? '—' : stats.visitorsWaitingBadge.toString()} trend="neutral" />
          <KpiCard title="Overstayed" value={loading ? '—' : stats.visitorsOverstayed.toString()} trend="down" />
          <KpiCard title="Documents Reviewed" value={loading ? '—' : stats.documentsReviewed.toString()} trend="up" />
          <KpiCard title="Documents Pending" value={loading ? '—' : stats.documentsPending.toString()} trend="neutral" />
          <KpiCard title="Documents Rejected" value={loading ? '—' : stats.documentsRejected.toString()} trend="down" />
          <KpiCard title="Avg Review Time" value={loading ? '—' : stats.avgReviewTime} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Visitors Per Day">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={visitorsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Visits By Status">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={visitsByStatus} dataKey="value" nameKey="name" label>
                    {visitsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.name.toLowerCase().replace(' ', '_') as keyof typeof statusColors] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Most Visited Departments">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Top Host Employees">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hostEmployeesData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Visitor Companies">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={companiesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Hourly Check-In Trend">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Appointments by Department">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appointmentsByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notification Report</h3>
              <p className="text-sm text-gray-500">Notification metrics and analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportNotificationData('csv')} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => exportNotificationData('pdf')} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <KpiCard title="Total Notifications" value={loading ? '—' : notificationStats.total.toString()} />
              <KpiCard title="Unread" value={loading ? '—' : notificationStats.unread.toString()} trend={notificationStats.unread > 0 ? 'down' : 'up'} />
              <KpiCard title="Read" value={loading ? '—' : notificationStats.read.toString()} trend="up" />
              <KpiCard title="Avg Response" value={loading ? '—' : notificationStats.avgResponseTime ? `${notificationStats.avgResponseTime.toFixed(1)}h` : '—'} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="By Type">
                {loading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={notificationByTypeData} dataKey="value" nameKey="name" label>
                        {notificationByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
              <ChartCard title="By Priority">
                {loading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={notificationByPriorityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Visits</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : recentVisits.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No visits found</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor Organization</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Check-In</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Check-Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{visit.visitor?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.visitor?.visitor_organization || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.status.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {visit.check_in_time ? new Date(visit.check_in_time).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {visit.check_out_time ? new Date(visit.check_out_time).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, trend }: { title: string; value: string; trend?: 'up' | 'down' | 'neutral' }) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-amber-600 bg-amber-50',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {trend && (
        <div className="mt-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trendColors[trend]}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="flex items-center justify-center h-[250px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}
