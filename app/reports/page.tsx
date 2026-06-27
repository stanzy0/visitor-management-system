'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { logAuditAction } from '@/lib/audit'
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
  visitor: { full_name: string; company: string } | null
  employee: { full_name: string; department: string } | null
}

interface Visitor {
  id: string
  full_name: string
  company: string
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
  })
  const [visitorsPerDay, setVisitorsPerDay] = useState<Array<{ date: string; count: number }>>([])
  const [visitsByStatus, setVisitsByStatus] = useState<Array<{ name: string; value: number }>>([])
  const [departmentsData, setDepartmentsData] = useState<Array<{ name: string; count: number }>>([])
  const [hostEmployeesData, setHostEmployeesData] = useState<Array<{ name: string; count: number }>>([])
  const [companiesData, setCompaniesData] = useState<Array<{ name: string; count: number }>>([])
  const [hourlyData, setHourlyData] = useState<Array<{ hour: string; count: number }>>([])
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [exporting, setExporting] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

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
      fetchAllData()
    }
  }, [dateFilter, customDateFrom, customDateTo, authChecking])

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => fetchAllData())
      .subscribe()
  }

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
      ])
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (start: Date, end: Date) => {
    const [visitorsRes, visitsRes, pendingRes, approvedRes, rejectedRes, checkedInRes, checkedOutRes] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact' }),
      supabase.from('visits').select('id,check_in_time,check_out_time', { count: 'exact' }).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'pending').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id,check_in_time,check_out_time', { count: 'exact' }).eq('status', 'checked_in').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'rejected').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_out').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    ])

    const checkedInVisits = checkedInRes.data || []
    const avgDuration = calculateAvgDuration(checkedInVisits)

    setStats({
      totalVisitors: visitorsRes.count ?? 0,
      totalVisits: visitsRes.count ?? 0,
      approvedVisits: approvedRes.count ?? 0,
      pendingVisits: pendingRes.count ?? 0,
      rejectedVisits: rejectedRes.count ?? 0,
      checkedInVisits: checkedInRes.count ?? 0,
      checkedOutVisits: checkedOutRes.count ?? 0,
      avgVisitDuration: avgDuration,
      activeVisitors: checkedInRes.count ?? 0,
    })
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
      .lt('created_at', end.toISOString())

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
      .lt('created_at', end.toISOString())

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
      .select('visitor:visitors(company)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    const companyCounts: Record<string, number> = {}
    data?.forEach(v => {
      const company = v.visitor?.company || 'Unknown'
      companyCounts[company] = (companyCounts[company] || 0) + 1
    })

    setCompaniesData(Object.entries(companyCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))
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

  const fetchRecentVisits = async () => {
    const { data } = await supabase
      .from('visits')
      .select('*, visitor:visitors(full_name, company), employee:employees(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentVisits(data || [])
  }

  const exportData = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(true)
    logAuditAction('Report Exported', 'report', null, `Report exported in ${format.toUpperCase()} format`)
    
    if (format === 'csv') {
      const headers = ['Visitor', 'Company', 'Host', 'Purpose', 'Status', 'Check-In', 'Check-Out']
      const csvContent = [
        headers.join(','),
        ...recentVisits.map(v => [
          v.visitor?.full_name || '',
          v.visitor?.company || '',
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
    }
    
    setExporting(false)
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Company</th>
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
                      <td className="px-4 py-3 text-gray-600">{visit.visitor?.company || '—'}</td>
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