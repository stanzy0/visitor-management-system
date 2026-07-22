'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole, PERMISSIONS } from '@/lib/auth'
import {
  LayoutDashboard,
  Users,
  Clock,
  UserCheck,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Scan,
  Car,
  Bell,
  AlertTriangle,
  ShieldAlert,
  Crown,
  Monitor,
  Calendar,
  Building2,
  BarChart3,
  IdCard,
  Download,
  Printer,
  RefreshCw,
  XCircle,
  CheckCircle,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import StatCard from '@/components/dashboard/StatCard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import SecurityPanel from '@/components/dashboard/SecurityPanel'
import ChartCard from '@/components/dashboard/ChartCard'
import { useDashboardData, DashboardFilters, SecurityAlert } from '@/hooks/useDashboardData'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'This Month', value: 'thisMonth' },
]

const NAV_SECTIONS = [
  { title: 'MAIN', items: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard' },
    { label: 'Reception Kiosk', icon: Monitor, href: '/kiosk', permission: 'dashboard' },
    { label: 'Visitors', icon: Users, href: '/visitors', permission: 'visitors' },
    { label: 'Appointments', icon: Calendar, href: '/appointments', permission: 'appointments' },
    { label: 'Visits', icon: Clock, href: '/visits', permission: 'visits' },
    { label: 'Badges', icon: IdCard, href: '/badges', permission: 'badges' },
    { label: 'QR Scanner', icon: Scan, href: '/scanner', permission: 'scanner' },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Watchlist', icon: ShieldAlert, href: '/watchlist', permission: 'watchlist' },
    { label: 'ID Verification', icon: FileText, href: '/documents', permission: 'documents' },
    { label: 'Emergency Occupancy', icon: AlertTriangle, href: '/emergency', permission: 'emergency' },
    { label: 'Host Portal', icon: Users, href: '/host', permission: 'host' },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Employees', icon: UserCheck, href: '/employees', permission: 'employees' },
    { label: 'Office Locations', icon: Building2, href: '/office-locations', permission: 'settings' },
    { label: 'Vehicle Management', icon: Car, href: '/vehicles', permission: 'vehicles' },
    { label: 'Users', icon: Users, href: '/users', permission: 'users' },
  ]},
  { title: 'MONITORING', items: [
    { label: 'Notifications', icon: Bell, href: '/notifications', permission: 'dashboard' },
    { label: 'Audit Logs', icon: ShieldCheck, href: '/audit-logs', permission: 'audit-logs' },
    { label: 'Reports', icon: FileText, href: '/reports', permission: 'reports' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics', permission: 'analytics' },
    { label: 'Email Logs', icon: FileText, href: '/email-logs', permission: 'email' },
  ]},
  { title: 'CONFIGURATION', items: [
    { label: 'Settings', icon: Settings, href: '/settings', permission: 'settings' },
  ]},
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [userEmail, setUserEmail] = useState('')
  const [filters, setFilters] = useState<DashboardFilters>({ range: 'today' })
  const [exporting, setExporting] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<Array<{ id: string; title: string; message: string; type: string; created_at: string; is_read: boolean }>>([])

  const { stats, activity, securityAlerts, visitorsByDay, visitorsByMonth, visitorsByDepartment, visitorsByHost, visitorsByCompany, visitorsByPurpose, badgeStatusDistribution, employeesByDepartment, loading, error, trendLabel, refetch } = useDashboardData(filters)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) { window.location.href = '/login'; return }
      setUserRole(user.role)
      setUserEmail(user.email)
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = await getCurrentUser()
      if (!user) return
      const { data: userRoleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5)
      if (userRoleData?.role) query = query.or(`user_id.eq.${user.id},recipient_role.eq.${userRoleData.role}`)
      const { data } = await query
      if (data) setRecentNotifications(data)
    }
    fetchNotifications()
  }, [])

  const getNavItems = (sectionItems: typeof NAV_SECTIONS[0]['items']) =>
    sectionItems.filter(item => PERMISSIONS[userRole]?.includes(item.permission))

  const isAdmin = userRole === 'Admin'
  const isSecurity = userRole === 'Security'
  const isReceptionist = userRole === 'Receptionist'
  const showAllSections = isAdmin
  const showSecurityOnly = isSecurity && !isAdmin
  const showOperational = isReceptionist && !isAdmin

  const handleExportDashboard = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(true)
    try {
      if (format === 'csv') {
        const rows = [
          ['Metric', 'Value'],
          ['Visitors Today', stats.visitorsToday],
          ['Visitors This Week', stats.visitorsThisWeek],
          ['Visitors This Month', stats.visitorsThisMonth],
          ['Currently Inside', stats.visitorsCurrentlyInside],
          ['Pending Approvals', stats.pendingApprovals],
          ['Checked In', stats.checkedIn],
          ['Checked Out', stats.checkedOut],
          ['Active Badges', stats.activeBadges],
          ['Cancelled Badges', stats.cancelledBadges],
          ['Expired Badges', stats.expiredBadges],
          ['Registered Employees', stats.registeredEmployees],
          ['Office Locations', stats.officeLocations],
          ['Audit Events Today', stats.auditEventsToday],
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet([
          { Metric: 'Visitors Today', Value: stats.visitorsToday },
          { Metric: 'Visitors This Week', Value: stats.visitorsThisWeek },
          { Metric: 'Visitors This Month', Value: stats.visitorsThisMonth },
          { Metric: 'Currently Inside', Value: stats.visitorsCurrentlyInside },
          { Metric: 'Pending Approvals', Value: stats.pendingApprovals },
          { Metric: 'Checked In', Value: stats.checkedIn },
          { Metric: 'Checked Out', Value: stats.checkedOut },
          { Metric: 'Active Badges', Value: stats.activeBadges },
          { Metric: 'Cancelled Badges', Value: stats.cancelledBadges },
          { Metric: 'Expired Badges', Value: stats.expiredBadges },
          { Metric: 'Registered Employees', Value: stats.registeredEmployees },
          { Metric: 'Office Locations', Value: stats.officeLocations },
          { Metric: 'Audit Events Today', Value: stats.auditEventsToday },
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Dashboard')
        XLSX.writeFile(wb, `dashboard-export-${new Date().toISOString().split('T')[0]}.xlsx`)
      } else if (format === 'pdf') {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text('Executive Dashboard Report', 14, 22)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
        autoTable(doc, {
          startY: 40,
          head: [['Metric', 'Value']],
          body: [
            ['Visitors Today', stats.visitorsToday.toString()],
            ['Visitors This Week', stats.visitorsThisWeek.toString()],
            ['Visitors This Month', stats.visitorsThisMonth.toString()],
            ['Currently Inside', stats.visitorsCurrentlyInside.toString()],
            ['Pending Approvals', stats.pendingApprovals.toString()],
            ['Checked In', stats.checkedIn.toString()],
            ['Checked Out', stats.checkedOut.toString()],
            ['Active Badges', stats.activeBadges.toString()],
            ['Cancelled Badges', stats.cancelledBadges.toString()],
            ['Expired Badges', stats.expiredBadges.toString()],
            ['Registered Employees', stats.registeredEmployees.toString()],
            ['Office Locations', stats.officeLocations.toString()],
            ['Audit Events Today', stats.auditEventsToday.toString()],
          ],
        })
        doc.save(`dashboard-export-${new Date().toISOString().split('T')[0]}.pdf`)
      }
    } catch (err) {
    } finally {
      setExporting(false)
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
        </div>
      </div>
    )
  }

  const renderStatCards = () => {
    if (showOperational) {
      return [
        { title: "Today's Visitors", value: stats.visitorsToday, icon: Users, color: 'blue' as const, trend: stats.visitorsTrend },
        { title: 'Checked In', value: stats.checkedIn, icon: UserCheck, color: 'green' as const },
        { title: 'Checked Out', value: stats.checkedOut, icon: LogOut, color: 'gray' as const },
        { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const },
      ]
    }
    if (showSecurityOnly) {
      return [
        { title: 'Currently Inside', value: stats.visitorsCurrentlyInside, icon: Users, color: 'indigo' as const },
        { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const },
        { title: 'Active Badges', value: stats.activeBadges, icon: IdCard, color: 'emerald' as const },
        { title: 'Security Alerts', value: securityAlerts.length, icon: ShieldAlert, color: 'red' as const },
      ]
    }
    return [
      { title: "Today's Visitors", value: stats.visitorsToday, icon: Users, color: 'blue' as const, trend: stats.visitorsTrend },
      { title: 'This Week', value: stats.visitorsThisWeek, icon: Calendar, color: 'green' as const },
      { title: 'This Month', value: stats.visitorsThisMonth, icon: TrendingUp, color: 'purple' as const },
      { title: 'Currently Inside', value: stats.visitorsCurrentlyInside, icon: UserCheck, color: 'indigo' as const },
      { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const },
      { title: 'Checked In', value: stats.checkedIn, icon: UserCheck, color: 'green' as const },
      { title: 'Checked Out', value: stats.checkedOut, icon: LogOut, color: 'gray' as const },
      { title: 'Active Badges', value: stats.activeBadges, icon: IdCard, color: 'emerald' as const },
      { title: 'Cancelled Badges', value: stats.cancelledBadges, icon: XCircle, color: 'orange' as const },
      { title: 'Expired Badges', value: stats.expiredBadges, icon: ShieldAlert, color: 'red' as const },
      { title: 'Employees', value: stats.registeredEmployees, icon: Crown, color: 'indigo' as const },
      { title: 'Office Locations', value: stats.officeLocations, icon: Building2, color: 'purple' as const },
      { title: 'Audit Events Today', value: stats.auditEventsToday, icon: FileText, color: 'blue' as const },
      { title: 'Documents Today', value: stats.documentsUploadedToday, icon: FileText, color: 'teal' as const },
      { title: 'Pending Verification', value: stats.pendingVerification, icon: Clock, color: 'amber' as const },
      { title: 'Verified Documents', value: stats.verifiedDocuments, icon: CheckCircle, color: 'green' as const },
      { title: 'Rejected Documents', value: stats.rejectedDocuments, icon: XCircle, color: 'red' as const },
      { title: 'Missing Documents', value: stats.missingDocuments, icon: AlertTriangle, color: 'orange' as const },
    ]
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 flex-shrink-0">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">VMS Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          {NAV_SECTIONS.map((section) => {
            const items = getNavItems(section.items)
            if (items.length === 0) return null
            return (
              <div key={section.title} className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.title}</h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.label}>
                      <a href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <a href="/login" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-5 w-5" />
            Logout
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-gray-100">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Executive Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filters.range}
              onChange={(e) => setFilters({ ...filters, range: e.target.value as DashboardFilters['range'] })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <NotificationBell />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">{userRole.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderStatCards().map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value.toString()}
                  icon={stat.icon}
                  color={stat.color}
                  trend={stat.trend}
                />
              ))}
            </div>

            {/* Activity Feed + Security */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityFeed activities={activity} />
              </div>
              <div>
                <SecurityPanel alerts={securityAlerts} />
              </div>
            </div>

            {/* Visitor Analytics */}
            {showAllSections && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Visitor Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard title="Visitors by Day" subtitle="Last 30 days">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Visitors by Month" subtitle="Current year">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="By Department">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={visitorsByDepartment} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                          {visitorsByDepartment.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="By Host Employee">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByHost} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="By Company">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByCompany} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="By Purpose">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByPurpose}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>
            )}

            {/* Badge Analytics */}
            {showAllSections && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Badge Analytics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard title="Generated" value={stats.badgesGenerated.toString()} icon={Printer} color="blue" />
                  <StatCard title="Printed" value={stats.badgesPrinted.toString()} icon={Printer} color="green" />
                  <StatCard title="Reprints" value={stats.badgesReprinted.toString()} icon={RefreshCw} color="amber" />
                  <StatCard title="Cancelled" value={stats.cancelledBadges.toString()} icon={XCircle} color="red" />
                  <StatCard title="Expired" value={stats.expiredBadges.toString()} icon={ShieldAlert} color="orange" />
                </div>
                <ChartCard title="Badge Status Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={badgeStatusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                        {badgeStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* Employee Analytics */}
            {showAllSections && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Employee Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard title="Employees by Department">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={employeesByDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Visitors by Host">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitorsByHost} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>
            )}

            {/* Export Section */}
            {showAllSections && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Export Dashboard</h3>
                    <p className="text-sm text-gray-500">Download current dashboard view</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExportDashboard('csv')} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      CSV
                    </button>
                    <button onClick={() => handleExportDashboard('excel')} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                      <Download className="h-4 w-4" />
                      Excel
                    </button>
                    <button onClick={() => handleExportDashboard('pdf')} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
