'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole } from '@/lib/auth-client'
import { getAuthHeaders } from '@/lib/client/api'
import { motion } from 'framer-motion'
import { useBranding } from '@/hooks/useBranding'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  Users,
  Clock,
  UserCheck,
  User,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Crown,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Search,
  Loader2,
  UserPlus,
  Bell,
  Car,
} from 'lucide-react'
import PremiumStatCard, { CardColor } from '@/components/dashboard/premium/PremiumStatCard'
import QuickActionCard from '@/components/dashboard/premium/QuickActionCard'
import PendingApprovalsTable from '@/components/dashboard/premium/PendingApprovalsTable'
import RecentVisitorsTable from '@/components/dashboard/premium/RecentVisitorsTable'
import VisitorTrendChart from '@/components/dashboard/premium/VisitorTrendChart'
import ActivityTimelinePremium from '@/components/dashboard/premium/ActivityTimelinePremium'
import SystemStatus from '@/components/dashboard/premium/SystemStatus'
import PremiumSidebar from '@/components/dashboard/premium/PremiumSidebar'
import PremiumHeader from '@/components/dashboard/premium/PremiumHeader'
import { SkeletonCard, SkeletonChart, SkeletonActivity } from '@/components/ui/Skeletons'
import SecurityPanel from '@/components/dashboard/SecurityPanel'
import ChartCard from '@/components/dashboard/ChartCard'
import { useDashboardData, DashboardFilters } from '@/hooks/useDashboardData'
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
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const COLORS = ['#1e40af', '#0f766e', '#b91c1c', '#a16207', '#6d28d9', '#be185d', '#0f766e', '#c2410c']

const QUICK_ACTIONS = [
  { label: 'Register Visitor', description: 'Add a new visitor to the system', icon: UserPlus, href: '/visitors/new', color: 'blue' as const },
  { label: 'Check In', description: 'Process visitor arrival and entry', icon: UserCheck, href: '/visits?status=checked_in', color: 'green' as const },
  { label: 'Check Out', description: 'Process visitor departure', icon: LogOut, href: '/visits?status=checked_out', color: 'gray' as const },
  { label: 'Print Badge', description: 'Generate and print visitor badge', icon: Printer, href: '/badges', color: 'amber' as const },
  { label: 'Search Visitor', description: 'Search visitor records', icon: Search, href: '/visitors', color: 'purple' as const },
  { label: 'Appointments', description: 'View and manage appointments', icon: Calendar, href: '/appointments', color: 'indigo' as const },
]

export default function DashboardPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [userEmail, setUserEmail] = useState('')
  const [authReady, setAuthReady] = useState(false)
   const [chartColors, setChartColors] = useState<string[]>(COLORS)
  const { branding } = useBranding()
  const { notifications, unreadCount } = useNotifications()
  const [filters, setFilters] = useState<DashboardFilters>({ range: 'today' })
  const [exporting, setExporting] = useState(false)
  const [appointmentsToday, setAppointmentsToday] = useState(0)
  const [securityStats, setSecurityStats] = useState({
    visitorsWaitingAtGate: 0,
    visitorsCleared: 0,
    visitorsDenied: 0,
    visitorsCurrentlyInside: 0,
    expiredBadges: 0,
    vehiclesInside: 0,
    visitorsDueToExit: 0,
    watchlistMatches: 0,
  })
  const [pendingOnlineRegistrations, setPendingOnlineRegistrations] = useState<Array<{ id: string; full_name: string; registration_number: string; created_at: string; purpose: string; employee: { full_name: string; department: string } | null }>>([])
  const [recentVisitors, setRecentVisitors] = useState<Array<{ id: string; full_name: string; photo_url?: string | null; status: string; created_at: string; purpose?: string; host_name?: string; host_department?: string }>>([])
  const [pendingDocuments, setPendingDocuments] = useState<Array<{ id: string; visitor_name: string; organization: string; document_type: string; document_number: string; created_at: string; photo_url: string | null }>>([])

  const { stats, activity, securityAlerts, visitorsByDay, visitorsByMonth, visitorsByDepartment, visitorsByHost, visitorsByCompany, visitorsByPurpose, badgeStatusDistribution, employeesByDepartment, loading, error, refetch } = useDashboardData(filters, authReady)

  useEffect(() => {
    if (branding) {
      setChartColors([
        branding.primary_color,
        branding.secondary_color,
        branding.accent_color,
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
      ])
    }
  }, [branding])

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today)
        setAppointmentsToday(data?.length ?? 0)
      } catch {
        // ignore
      }
    }
    fetchAppointments()
  }, [])

  useEffect(() => {
    const fetchSecurityStats = async () => {
      try {
        const res = await fetch('/api/security/stats', {
          headers: await getAuthHeaders(),
        })
        console.log('Security Stats Status:', res.status)
        if (!res.ok) {
          const text = await res.text()
          console.log('Security Stats Error Body:', text)
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = await res.json()
        if (json.success) {
          setSecurityStats(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch security stats:', err)
      }
    }
    fetchSecurityStats()
  }, [])

  useEffect(() => {
    const fetchPendingOnlineRegistrations = async () => {
      try {
        const res = await fetch('/api/public/registrations', {
          headers: await getAuthHeaders(),
        })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = await res.json()
        if (json.success) {
          setPendingOnlineRegistrations(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch pending online registrations:', err)
      }
    }
    fetchPendingOnlineRegistrations()
  }, [])

  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const res = await fetch('/api/documents?verification_status=Pending&limit=5', {
          headers: await getAuthHeaders(),
        })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = await res.json()
        const documents: Array<{
          id: string
          visitor?: { full_name?: string; visitor_organization?: string; photo_url?: string | null }
          document_type: string
          document_number?: string
          created_at: string
        }> = json.data || []
        if (res.ok && documents.length > 0) {
          setPendingDocuments(documents.map((doc) => ({
            id: doc.id,
            visitor_name: doc.visitor?.full_name || 'Unknown',
            organization: doc.visitor?.visitor_organization || '',
            document_type: doc.document_type,
            document_number: doc.document_number || '',
            created_at: doc.created_at,
            photo_url: doc.visitor?.photo_url || null,
          })))
        } else if (res.ok) {
          setPendingDocuments([])
        }
      } catch (err) {
        console.error('Failed to fetch pending documents:', err)
      }
    }
    fetchPendingDocuments()
  }, [authReady])

  useEffect(() => {
    const fetchRecentVisitors = async () => {
      try {
        const { data } = await supabase
          .from('visits')
          .select('id, status, created_at, purpose, visitor:visitors(full_name, photo_url), employee:employees(full_name, department)')
          .order('created_at', { ascending: false })
          .limit(8)

        if (data) {
          const mapped = (data as Array<{
            id: string
            status: string
            created_at: string
            purpose?: string
            visitor?: { full_name?: string; photo_url?: string | null }
            employee?: { full_name?: string; department?: string }
          }>).map((visit) => ({
            id: visit.id,
            full_name: visit.visitor?.full_name || 'Unknown',
            photo_url: visit.visitor?.photo_url || null,
            status: visit.status,
            created_at: visit.created_at,
            purpose: visit.purpose,
            host_name: visit.employee?.full_name || '—',
            host_department: visit.employee?.department || '—',
          }))
          setRecentVisitors(mapped)
        }
      } catch (err) {
        console.error('Failed to fetch recent visitors:', err)
      }
    }
    fetchRecentVisitors()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore logout errors
    }
    router.replace('/login')
    router.refresh()
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) { window.location.href = '/login'; return }
        setUserRole(user.role)
        setUserEmail(user.email)
        setAuthChecking(false)
        setAuthReady(true)
      } catch {
        window.location.href = '/login'
      }
    }
    checkAuth()
  }, [])

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
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleApproveRegistration = async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/public/registrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ visit_id: id, action: 'approve' }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Request failed: ${res.status} - ${errText.substring(0, 100)}`)
      }
      await res.json()
      window.location.reload()
    } catch (err) {
      console.error('Failed to approve registration:', err)
    }
  }

  const handleRejectRegistration = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (reason === null) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/public/registrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ visit_id: id, action: 'reject', reason }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Request failed: ${res.status} - ${errText.substring(0, 100)}`)
      }
      await res.json()
      window.location.reload()
    } catch (err) {
      console.error('Failed to reject registration:', err)
    }
  }

  const handleViewProfile = (id: string) => {
    router.push('/reception/badge-preview/' + id)
  }

  const handlePrintBadge = (id: string) => {
    router.push('/visitors/' + id)
  }

  const isAdmin = userRole === 'Admin'
  const showAllSections = isAdmin

  const emergencyAlertCount = securityAlerts.filter(a => a.severity === 'critical').length
  const warningAlertCount = securityAlerts.filter(a => a.severity === 'warning').length
  const emergencyColor: CardColor = emergencyAlertCount > 0 ? 'red' : warningAlertCount > 0 ? 'orange' : 'green'
  const emergencyDescription = securityAlerts.length > 0
    ? `${securityAlerts.length} active alert${securityAlerts.length !== 1 ? 's' : ''}`
    : 'All systems operational'

  const kpiCards = [
    { title: 'Visitors Today', value: stats.visitorsToday, description: 'Visitor check-ins today', icon: Users, color: 'blue' as const, trend: stats.visitorsTrend },
    { title: 'Currently Checked In', value: stats.visitorsCurrentlyInside, description: 'Visitors on premises', icon: UserCheck, color: 'green' as const },
    { title: 'Pending Approvals', value: stats.pendingApprovals, description: 'Awaiting approval', icon: Clock, color: 'amber' as const },
    { title: 'Badges Printed Today', value: stats.badgesPrinted, description: 'Badges issued today', icon: Printer, color: 'indigo' as const },
    { title: 'Total Employees', value: stats.registeredEmployees, description: 'Active employee roster', icon: Crown, color: 'purple' as const },
    { title: 'Emergency Alerts', value: emergencyAlertCount, description: emergencyDescription, icon: ShieldAlert, color: emergencyColor },
  ]

  const activityTimelineEvents = activity.slice(0, 10).map(a => ({
    id: a.id,
    time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: a.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: a.details,
    type: a.action.includes('checkin') ? 'checkin' as const : a.action.includes('checkout') ? 'checkout' as const : a.action.includes('approve') ? 'approval' as const : a.action.includes('badge') ? 'badge' as const : a.action.includes('security') || a.action.includes('alert') ? 'security' as const : 'registration' as const,
  }))

  if (authChecking) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-dashboard-bg">
      <PremiumSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
        userEmail={userEmail}
        onLogout={handleLogout}
        currentPath="/dashboard"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <PremiumHeader
          userEmail={userEmail}
          userRole={userRole}
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters as DashboardFilters)}
          onExport={handleExportDashboard}
          exporting={exporting}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </motion.div>
            )}

            {!loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
              >
                {kpiCards.map((card, index) => (
                  <PremiumStatCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    description={card.description}
                    icon={card.icon}
                    color={card.color}
                    trend={card.trend}
                    index={index}
                  />
                ))}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
            >
              {QUICK_ACTIONS.map((action, index) => (
                <QuickActionCard
                  key={action.label}
                  label={action.label}
                  description={action.description}
                  icon={action.icon}
                  href={action.href}
                  color={action.color}
                  index={index}
                />
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentVisitorsTable
                visitors={recentVisitors}
                onViewProfile={handleViewProfile}
                onPrintBadge={handlePrintBadge}
              />
              <PendingApprovalsTable
                approvals={pendingOnlineRegistrations}
                onApprove={handleApproveRegistration}
                onReject={handleRejectRegistration}
                onViewProfile={handleViewProfile}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                <SkeletonActivity />
              ) : (
                <ActivityTimelinePremium events={activityTimelineEvents} />
              )}
              {loading ? (
                <SkeletonChart />
              ) : (
                <VisitorTrendChart data={visitorsByDay} loading={loading} />
              )}
            </div>

            <SystemStatus />

            {notifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                      <Bell className="h-5 w-5 text-primary" />
                      Recent Notifications
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{notifications.length} recent notification{notifications.length !== 1 ? 's' : ''}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/notifications')}
                    aria-label="View all notifications"
                    className="text-xs font-medium text-primary hover:text-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
                  >
                    View All
                  </motion.button>
                </div>
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-gray-50/80 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-gray-50 flex-shrink-0">
                          <Bell className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notification.message}</p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {securityAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
              >
                <SecurityPanel alerts={securityAlerts} />
              </motion.div>
            )}

            {securityStats.visitorsWaitingAtGate > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                <PremiumStatCard title="Waiting at Gate" value={securityStats.visitorsWaitingAtGate} icon={Users} color="red" index={0} />
                <PremiumStatCard title="Cleared" value={securityStats.visitorsCleared} icon={CheckCircle} color="green" index={1} />
                <PremiumStatCard title="Denied" value={securityStats.visitorsDenied} icon={XCircle} color="red" index={2} />
                <PremiumStatCard title="Vehicles Inside" value={securityStats.vehiclesInside} icon={Car} color="amber" index={3} />
              </motion.div>
            )}

            {pendingDocuments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between cursor-pointer"
                     onClick={() => router.push('/documents?verification_status=Pending')}>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Pending Documents</h2>
                    <p className="text-sm text-gray-500">{pendingDocuments.length} documents awaiting verification</p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {doc.photo_url ? (
                          <img src={doc.photo_url} alt={doc.visitor_name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{doc.visitor_name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{doc.document_type} • {doc.document_number}</p>
                          {doc.organization && <p className="text-xs text-gray-400">{doc.organization}</p>}
                        </div>
                        <div className="text-right">
                          <Clock className="h-4 w-4 text-amber-600 inline-block mb-1" />
                          <p className="text-xs text-gray-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {showAllSections && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Appointment Analytics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <PremiumStatCard title="Today's Appointments" value={appointmentsToday.toString()} icon={Calendar} color="blue" onClick={() => router.push('/appointments')} index={0} />
                  <PremiumStatCard title="Arrived" value="0" icon={UserCheck} color="amber" onClick={() => router.push('/appointments?status=Arrived')} index={1} />
                  <PremiumStatCard title="Checked In" value="0" icon={CheckCircle} color="green" onClick={() => router.push('/appointments?status=Checked In')} index={2} />
                  <PremiumStatCard title="Completed" value="0" icon={CheckCircle2} color="green" onClick={() => router.push('/appointments?status=Completed')} index={3} />
                  <PremiumStatCard title="Cancelled" value="0" icon={XCircle} color="red" onClick={() => router.push('/appointments?status=Cancelled')} index={4} />
                  <PremiumStatCard title="No Shows" value="0" icon={XCircle} color="orange" onClick={() => router.push('/appointments?status=No Show')} index={5} />
                </div>
              </div>
            )}

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
                         <Bar dataKey="count" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
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
                         <Bar dataKey="count" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard title="By Department">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={visitorsByDepartment} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                          {visitorsByDepartment.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
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
                         <Bar dataKey="count" fill={chartColors[6]} radius={[0, 4, 4, 0]} />
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
                         <Bar dataKey="count" fill={chartColors[7]} radius={[0, 4, 4, 0]} />
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
                         <Bar dataKey="count" fill={chartColors[4]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>
            )}

            {showAllSections && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Badge Analytics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <PremiumStatCard title="Generated" value={stats.badgesGenerated.toString()} icon={Printer} color="blue" index={0} />
                  <PremiumStatCard title="Printed" value={stats.badgesPrinted.toString()} icon={Printer} color="green" index={1} />
                  <PremiumStatCard title="Reprints" value={stats.badgesReprinted.toString()} icon={RefreshCw} color="amber" index={2} />
                  <PremiumStatCard title="Cancelled" value={stats.cancelledBadges.toString()} icon={XCircle} color="red" index={3} />
                  <PremiumStatCard title="Expired" value={stats.expiredBadges.toString()} icon={ShieldAlert} color="orange" index={4} />
                </div>
                <ChartCard title="Badge Status Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={badgeStatusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                        {badgeStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

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
                         <Bar dataKey="count" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
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
                         <Bar dataKey="count" fill={chartColors[6]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>
            )}

            {showAllSections && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Export Dashboard</h3>
                    <p className="text-sm text-gray-500">Download current dashboard view</p>
                  </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleExportDashboard('csv')}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                        aria-label="Export as CSV"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleExportDashboard('excel')}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50 min-h-[44px]"
                        aria-label="Export as Excel"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Excel</span>
                      </button>
                      <button
                        onClick={() => handleExportDashboard('pdf')}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                        aria-label="Export as PDF"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
