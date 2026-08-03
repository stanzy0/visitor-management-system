'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Calendar, CheckCircle2, XCircle, BarChart3, Clock, TrendingUp } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import ReportKPICard from '@/components/reports/ReportKPICard'
import ReportFilters from '@/components/reports/ReportFilters'
import ChartCard from '@/components/reports/ChartCard'
import ReportTable from '@/components/reports/ReportTable'
import Link from 'next/link'

const COLORS = ['#0B3D91', '#1F6FEB', '#D4AF37', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface AppointmentRow {
  id: string
  appointment_number: string
  visitor?: { full_name: string } | null
  employee?: { full_name: string } | null
  appointment_date: string
  appointment_time: string
  status: string
}

export default function AppointmentReportsPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [exporting, setExporting] = useState(false)

  const [totalAppointments, setTotalAppointments] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [noShows, setNoShows] = useState(0)
  const [completionRate, setCompletionRate] = useState('0%')
  const [cancelled, setCancelled] = useState(0)
  const [avgDuration, setAvgDuration] = useState('0m')

  const [byDepartment, setByDepartment] = useState<Array<{ name: string; count: number }>>([])
  const [byStatus, setByStatus] = useState<Array<{ name: string; value: number }>>([])
  const [dailyAppointments, setDailyAppointments] = useState<Array<{ date: string; count: number }>>([])
  const [completionTrend, setCompletionTrend] = useState<Array<{ date: string; rate: number }>>([])
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRow[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) { window.location.href = '/login'; return }
      if (!PERMISSIONS[user.role]?.includes('reports')) { window.location.href = '/unauthorized'; return }
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  const getDateRange = () => {
    const now = new Date()
    let start: Date, end: Date = now
    switch (dateRange) {
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
      case '90days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
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
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear() + 1, 0, 1)
        break
      default:
        start = new Date(0)
        end = now
    }
    if (dateRange === 'custom' && customDateFrom && customDateTo) {
      return { start: new Date(customDateFrom), end: new Date(customDateTo) }
    }
    return { start, end }
  }

  useEffect(() => {
    if (authChecking) return
    let active = true
    const fetchData = async () => {
      setLoading(true)
      const { start, end } = getDateRange()
      try {
        let query = supabase.from('appointments').select('*,visitor:visitors(full_name),employee:employees(full_name,department)').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())

        if (status) {
          query = query.eq('status', status)
        }

        const { data: appointments } = await query
        if (!active) return

        const apts = (appointments as AppointmentRow[]) || []
        const total = apts.length
        const completedCount = apts.filter(a => a.status === 'Completed').length
        const noShowCount = apts.filter(a => a.status === 'No Show').length
        const cancelledCount = apts.filter(a => a.status === 'Cancelled').length
        const durations = apts.filter(a => a.appointment_time).map(a => {
          const [h, m] = a.appointment_time.split(':').map(Number)
          return h * 60 + m
        })
        const avgMin = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0
        const avgH = Math.floor(avgMin / 60)
        const avgM = avgMin % 60

        setTotalAppointments(total)
        setCompleted(completedCount)
        setNoShows(noShowCount)
        setCancelled(cancelledCount)
        setCompletionRate(total > 0 ? `${((completedCount / total) * 100).toFixed(1)}%` : '0%')
        setAvgDuration(`${avgH}h ${avgM}m`)

        const deptMap: Record<string, number> = {}
        apts.forEach(a => {
          const dept = a.employee?.full_name || 'Unknown'
          deptMap[dept] = (deptMap[dept] || 0) + 1
        })
        setByDepartment(Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10))

        const statusMap: Record<string, number> = {}
        apts.forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1 })
        setByStatus([
          { name: 'Scheduled', value: statusMap['Scheduled'] || 0 },
          { name: 'Arrived', value: statusMap['Arrived'] || 0 },
          { name: 'Checked In', value: statusMap['Checked In'] || 0 },
          { name: 'Completed', value: statusMap['Completed'] || 0 },
          { name: 'Cancelled', value: statusMap['Cancelled'] || 0 },
          { name: 'No Show', value: statusMap['No Show'] || 0 },
        ])

        const dailyMap: Record<string, number> = {}
        apts.forEach(a => {
          const d = new Date(a.appointment_date).toISOString().split('T')[0]
          dailyMap[d] = (dailyMap[d] || 0) + 1
        })
        setDailyAppointments(Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)))

        const trendMap: Record<string, { completed: number; total: number }> = {}
        apts.forEach(a => {
          const d = new Date(a.appointment_date).toISOString().split('T')[0]
          if (!trendMap[d]) trendMap[d] = { completed: 0, total: 0 }
          trendMap[d].total++
          if (a.status === 'Completed') trendMap[d].completed++
        })
        setCompletionTrend(Object.entries(trendMap).map(([date, v]) => ({
          date,
          rate: v.total > 0 ? parseFloat(((v.completed / v.total) * 100).toFixed(1)) : 0,
        })).sort((a, b) => a.date.localeCompare(b.date)))

        setRecentAppointments(apts.slice(0, 10))
      } catch (e) {
        console.error('Appointment reports error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, dateRange, customDateFrom, customDateTo, status])

  const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'print') => {
    setExporting(true)
    try {
      if (format === 'csv') {
        const headers = ['Number', 'Visitor', 'Host', 'Date', 'Time', 'Status']
        const rows = [headers.join(',')]
        recentAppointments.forEach(a => {
          rows.push([a.appointment_number, a.visitor?.full_name || '', a.employee?.full_name || '', a.appointment_date, a.appointment_time, a.status].join(','))
        })
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `appointment-report-${dateRange}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else if (format === 'print') {
        window.print()
      } else {
        alert(`${format.toUpperCase()} export would be processed server-side.`)
      }
    } finally {
      setExporting(false)
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/reports" className="text-sm text-primary hover:underline mb-1 inline-block">← Back to Reports</Link>
            <h1 className="text-2xl font-bold text-gray-900">Appointment Reports</h1>
            <p className="text-sm text-gray-500">Appointment analytics and trends</p>
          </div>
        </div>

        <ReportFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customDateFrom={customDateFrom}
          onCustomDateFromChange={setCustomDateFrom}
          customDateTo={customDateTo}
          onCustomDateToChange={setCustomDateTo}
          department={''}
          onDepartmentChange={() => {}}
          departments={[]}
          status={status}
          onStatusChange={setStatus}
          onExport={handleExport}
          exporting={exporting}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <ReportKPICard title="Total Appointments" value={totalAppointments} icon={Calendar} color="blue" loading={loading} index={0} />
          <ReportKPICard title="Completed" value={completed} icon={CheckCircle2} color="green" loading={loading} index={1} />
          <ReportKPICard title="No Shows" value={noShows} icon={XCircle} color="red" loading={loading} index={2} />
          <ReportKPICard title="Completion Rate" value={completionRate} icon={BarChart3} color="emerald" loading={loading} index={3} />
          <ReportKPICard title="Cancelled" value={cancelled} icon={XCircle} color="orange" loading={loading} index={4} />
          <ReportKPICard title="Avg Duration" value={avgDuration} icon={Clock} color="gray" loading={loading} index={5} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Appointments by Host" subtitle="Distribution by host employee" loading={loading}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0B3D91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Appointments by Status" subtitle="Status breakdown" loading={loading}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Daily Appointments" subtitle="Appointments per day" icon={TrendingUp} loading={loading}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyAppointments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1F6FEB" strokeWidth={2} dot={{ fill: '#1F6FEB' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Completion Trend" subtitle="Daily completion rate %" loading={loading}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ReportTable
          title="Recent Appointments"
          subtitle="Last 10 appointments"
          columns={[
            { key: 'number', label: 'Number', render: (item: AppointmentRow) => item.appointment_number },
            { key: 'visitor', label: 'Visitor', render: (item: AppointmentRow) => item.visitor?.full_name || '—' },
            { key: 'host', label: 'Host', render: (item: AppointmentRow) => item.employee?.full_name || '—' },
            { key: 'date', label: 'Date', render: (item: AppointmentRow) => item.appointment_date },
            { key: 'time', label: 'Time', render: (item: AppointmentRow) => item.appointment_time },
            { key: 'status', label: 'Status', render: (item: AppointmentRow) => item.status },
          ]}
          data={recentAppointments}
          loading={loading}
          emptyMessage="No appointments found"
        />
      </div>
    </div>
  )
}
