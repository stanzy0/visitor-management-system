'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole, PERMISSIONS } from '@/lib/auth-client'
import { getAuthHeaders } from '@/lib/client/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Clock,
  UserCheck,
  User,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Car,
  Bell,
  AlertTriangle,
  ShieldAlert,
  Crown,
  Calendar,
  Building2,
  BarChart3,
  IdCard,
  Download,
  Printer,
  RefreshCw,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Shield,
  Activity,
  GitBranch,
  FileDown,
  Database,
  HardDrive,
  QrCode,
  UserPlus,
  Scan,
} from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import SecurityPanel from '@/components/dashboard/SecurityPanel'
import ChartCard from '@/components/dashboard/ChartCard'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentVisitors from '@/components/dashboard/RecentVisitors'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline'
import { useDashboardData, DashboardFilters, SecurityAlert, ActivityItem } from '@/hooks/useDashboardData'
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

const COLORS = ['#1e40af', '#0f766e', '#b91c1c', '#a16207', '#6d28d9', '#be185d', '#0f766e', '#c2410c']

const FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'This Month', value: 'thisMonth' },
]

const QUICK_ACTIONS = [
  { label: 'Register Visitor', icon: UserPlus, href: '/visitors/new', color: 'blue' as const },
  { label: 'Approve Registration', icon: CheckCircle, href: '/dashboard', color: 'green' as const },
  { label: 'Check In', icon: UserCheck, href: '/visits?status=checked_in', color: 'emerald' as const },
  { label: 'Check Out', icon: LogOut, href: '/visits?status=checked_out', color: 'slate' as const },
  { label: 'Scan QR', icon: Scan, href: '/scanner', color: 'purple' as const },
  { label: 'Print Badge', icon: Printer, href: '/badges', color: 'amber' as const },
  { label: 'Employees', icon: Users, href: '/employees', color: 'indigo' as const },
  { label: 'Reports', icon: BarChart3, href: '/reports', color: 'teal' as const },
]

export default function DashboardPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [userEmail, setUserEmail] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>({ range: 'today' })
  const [exporting, setExporting] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<Array<{ id: string; title: string; message: string; type: string; created_at: string; is_read: boolean }>>([])
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
  const [propertyStats, setPropertyStats] = useState({
    totalItems: 0,
    itemsInside: 0,
    confiscatedItems: 0,
    pendingRelease: 0,
    releasedToday: 0,
    lostItems: 0,
    damagedItems: 0,
  })
  const [recentVisitors, setRecentVisitors] = useState<Array<{ id: string; full_name: string; status: string; created_at: string; purpose?: string; host_name?: string }>>([])
  const [pendingDocuments, setPendingDocuments] = useState<Array<{ id: string; visitor_name: string; organization: string; document_type: string; document_number: string; created_at: string; photo_url: string | null }>>([])

  const { stats, activity, securityAlerts, visitorsByDay, visitorsByMonth, visitorsByDepartment, visitorsByHost, visitorsByCompany, visitorsByPurpose, badgeStatusDistribution, employeesByDepartment, loading, error, trendLabel, refetch } = useDashboardData(filters, authReady)

  useEffect(() => {
    const fetchAppointments = async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today)
      setAppointmentsToday(data?.length ?? 0)
    }
    fetchAppointments()
  }, [])

  useEffect(() => {
    const fetchSecurityStats = async () => {
      try {
        const res = await fetch('/api/security/stats', {
          headers: await getAuthHeaders(),
        })
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
        const json = await res.json()
        console.log('[Dashboard] Documents response:', json)
        const documents = json.data || []
        console.log('[Dashboard] Pending documents:', documents)
        if (res.ok && documents.length > 0) {
          setPendingDocuments(documents.map((doc: any) => ({
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
    const fetchPropertyStats = async () => {
      try {
        const res = await fetch('/api/assets/stats', {
          headers: await getAuthHeaders(),
        })
        const json = await res.json()
        if (json.success) {
          setPropertyStats(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch property stats:', err)
      }
    }
    fetchPropertyStats()
  }, [])

  useEffect(() => {
    const fetchRecentVisitors = async () => {
      try {
        const { data } = await supabase
          .from('visits')
          .select('id, status, created_at, purpose, visitor:visitors(full_name)')
          .order('created_at', { ascending: false })
          .limit(8)

        if (data) {
          const mapped = data.map((visit: any) => ({
            id: visit.id,
            full_name: visit.visitor?.full_name || 'Unknown',
            status: visit.status,
            created_at: visit.created_at,
            purpose: visit.purpose,
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
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) { window.location.href = '/login'; return }
      setUserRole(user.role)
      setUserEmail(user.email)
      setAuthChecking(false)
      setAuthReady(true)
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

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="h-8 w-8 text-blue-600" />
        </motion.div>
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
        { title: "Today's Visitors", value: stats.visitorsToday, icon: Users, color: 'blue' as const, trend: stats.visitorsTrend, href: '/visitors?date=today' },
        { title: 'Checked In', value: stats.checkedIn, icon: UserCheck, color: 'green' as const, href: '/visits?status=checked_in' },
        { title: 'Checked Out', value: stats.checkedOut, icon: LogOut, color: 'gray' as const, href: '/visits?status=checked_out' },
        { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const, href: '/visits?status=pending' },
      ]
    }
    if (showSecurityOnly) {
      return [
        { title: 'Currently Inside', value: stats.visitorsCurrentlyInside, icon: Users, color: 'indigo' as const, href: '/visits?status=checked_in' },
        { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const, href: '/visits?status=pending' },
        { title: 'Active Badges', value: stats.activeBadges, icon: IdCard, color: 'emerald' as const, href: '/badges?status=Active' },
        { title: 'Security Alerts', value: securityAlerts.length, icon: ShieldAlert, color: 'red' as const, href: '/watchlist' },
        { title: 'Visitors Waiting at Gate', value: securityStats.visitorsWaitingAtGate, icon: Users, color: 'amber' as const, href: '/security/gate' },
        { title: 'Denied Today', value: securityStats.visitorsDenied, icon: XCircle, color: 'red' as const, href: '/security/gate' },
        { title: 'Watchlist Matches', value: securityStats.watchlistMatches, icon: ShieldAlert, color: 'red' as const, href: '/security/watchlist' },
        { title: 'Vehicles Inside', value: securityStats.vehiclesInside, icon: Car, color: 'purple' as const, href: '/security/gate-activity' },
      ]
    }
      return [
        { title: "Today's Visitors", value: stats.visitorsToday, icon: Users, color: 'blue' as const, trend: stats.visitorsTrend, href: '/visitors?date=today' },
        { title: 'Today\'s Appointments', value: appointmentsToday, icon: Calendar, color: 'purple' as const, href: '/appointments' },
        { title: 'This Week', value: stats.visitorsThisWeek, icon: Calendar, color: 'green' as const, href: '/visitors?date=week' },
        { title: 'This Month', value: stats.visitorsThisMonth, icon: Calendar, color: 'purple' as const, href: '/visitors?date=month' },
        { title: 'Currently Inside', value: stats.visitorsCurrentlyInside, icon: UserCheck, color: 'indigo' as const, href: '/visits?status=checked_in' },
        { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'amber' as const, href: '/visits?status=pending' },
        { title: 'Checked In', value: stats.checkedIn, icon: UserCheck, color: 'green' as const, href: '/visits?status=checked_in' },
        { title: 'Checked Out', value: stats.checkedOut, icon: LogOut, color: 'gray' as const, href: '/visits?status=checked_out' },
        { title: 'Active Badges', value: stats.activeBadges, icon: IdCard, color: 'emerald' as const, href: '/badges?status=Active' },
        { title: 'Cancelled Badges', value: stats.cancelledBadges, icon: XCircle, color: 'orange' as const, href: '/badges?status=Cancelled' },
        { title: 'Expired Badges', value: stats.expiredBadges, icon: ShieldAlert, color: 'red' as const, href: '/badges?status=Expired' },
        { title: 'Employees', value: stats.registeredEmployees, icon: Crown, color: 'indigo' as const, href: '/employees' },
        { title: 'Office Locations', value: stats.officeLocations, icon: Building2, color: 'purple' as const, href: '/office-locations' },
        { title: 'Audit Events Today', value: stats.auditEventsToday, icon: FileText, color: 'blue' as const, href: '/audit-logs?date=today' },
        { title: 'Documents Today', value: stats.documentsUploadedToday, icon: FileText, color: 'teal' as const, href: '/documents?date=today' },
        { title: 'Pending Verification', value: stats.pendingVerification, icon: Clock, color: 'amber' as const, href: '/documents?verification_status=Pending' },
        { title: 'Verified Documents', value: stats.verifiedDocuments, icon: CheckCircle, color: 'green' as const, href: '/documents?verification_status=Verified' },
        { title: 'Rejected Documents', value: stats.rejectedDocuments, icon: XCircle, color: 'red' as const, href: '/documents?verification_status=Rejected' },
        { title: 'Missing Documents', value: stats.missingDocuments, icon: AlertTriangle, color: 'orange' as const, href: '/visitors?missing_documents=true' },
        { title: 'Security Alerts', value: securityAlerts.length, icon: ShieldAlert, color: 'red' as const, href: '/watchlist' },
        { title: 'Visitors Waiting at Gate', value: securityStats.visitorsWaitingAtGate, icon: Users, color: 'amber' as const, href: '/security/gate' },
        { title: 'Denied Today', value: securityStats.visitorsDenied, icon: XCircle, color: 'red' as const, href: '/security/gate' },
        { title: 'Watchlist Matches', value: securityStats.watchlistMatches, icon: ShieldAlert, color: 'red' as const, href: '/security/watchlist' },
        { title: 'Vehicles Inside', value: securityStats.vehiclesInside, icon: Car, color: 'purple' as const, href: '/security/gate-activity' },
        { title: 'Waiting Badge', value: stats.visitorsWaitingBadge, icon: IdCard, color: 'orange' as const, href: '/badges' },
        { title: 'Overstayed', value: stats.visitorsOverstayed, icon: AlertTriangle, color: 'red' as const, href: '/visits?status=overstayed' },
        { title: 'Completed Appointments', value: stats.completedAppointments, icon: CheckCircle, color: 'green' as const, href: '/appointments' },
        { title: 'Cancelled Appointments', value: stats.cancelledAppointments, icon: XCircle, color: 'red' as const, href: '/appointments' },
      ]
  }

  const isAdmin = userRole === 'Admin'
  const isSecurity = userRole === 'Security'
  const isReceptionist = userRole === 'Receptionist'
  const showAllSections = isAdmin
  const showSecurityOnly = isSecurity && !isAdmin
  const showOperational = isReceptionist && !isAdmin

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
        userEmail={userEmail}
        onLogout={handleLogout}
        currentPath="/dashboard"
      />

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          userEmail={userEmail}
          userRole={userRole}
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters as DashboardFilters)}
          onExport={handleExportDashboard}
          exporting={exporting}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
               className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
             >
               {renderStatCards().map((stat, index) => (
                 <StatCard
                   key={stat.title}
                   title={stat.title}
                   value={stat.value.toString()}
                   icon={stat.icon}
                   color={stat.color}
                   trend={stat.trend}
                   onClick={stat.href ? () => { router.push(stat.href) } : undefined}
                   index={index}
                 />
               ))}
             </motion.div>

             <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-6">
               <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer"
                    onClick={() => router.push('/documents?verification_status=Pending')}>
                 <div>
                   <h2 className="text-lg font-semibold text-gray-900">Pending Documents</h2>
                   <p className="text-sm text-gray-500">{pendingDocuments.length} documents awaiting verification</p>
                 </div>
                 <Clock className="h-5 w-5 text-amber-600" />
               </div>
               <div className="divide-y divide-gray-100">
                 {pendingDocuments.length === 0 ? (
                   <div className="p-8 text-center text-gray-500">
                     <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                     <p>No pending documents</p>
                   </div>
                 ) : (
                   pendingDocuments.map((doc) => (
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
                           <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                         </div>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ActivityFeed activities={activity} />
                <QuickActions />
              </div>
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
                      <p className="text-sm text-gray-500">Latest 10 notifications</p>
                    </div>
                    <a href="/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</a>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No notifications</div>
                    ) : (
                      recentNotifications.slice(0, 10).map((n: any) => (
                        <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <SecurityPanel alerts={securityAlerts} />
              </div>
            </div>

            <RecentVisitors visitors={recentVisitors} />

            <ActivityTimeline events={activity.slice(0, 10).map(a => ({
              id: a.id,
              time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              title: a.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              description: a.details,
              type: a.action.includes('checkin') ? 'checkin' : a.action.includes('checkout') ? 'checkout' : a.action.includes('approve') ? 'approval' : a.action.includes('badge') ? 'badge' : a.action.includes('security') || a.action.includes('alert') ? 'security' : 'registration',
            }))} />

             {/* Pending Online Registrations */}
             {pendingOnlineRegistrations.length > 0 && (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
               >
                 <div className="p-4 lg:p-6 border-b border-gray-200">
                   <h2 className="text-lg font-semibold text-gray-900">Pending Online Registrations</h2>
                   <p className="text-sm text-gray-500">Review and approve visitor self-registrations</p>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                     <thead>
                       <tr className="border-b border-gray-200 bg-gray-50">
                         <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                         <th className="px-4 py-3 font-semibold text-gray-700">Registration #</th>
                         <th className="px-4 py-3 font-semibold text-gray-700">Submitted</th>
                         <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                         <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                         <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {pendingOnlineRegistrations.map((reg) => (
                         <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-4 py-3 font-medium text-gray-900">{reg.full_name}</td>
                           <td className="px-4 py-3 font-mono text-gray-600">{reg.registration_number}</td>
                           <td className="px-4 py-3 text-gray-600">{new Date(reg.created_at).toLocaleString()}</td>
                           <td className="px-4 py-3 text-gray-600">{reg.employee?.full_name || '—'}</td>
                           <td className="px-4 py-3 text-gray-600">{reg.purpose || '—'}</td>
                           <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => router.push('/reception/badge-preview/' + reg.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 min-h-[36px]">Preview Badge</button>
                                 <button onClick={async () => { const reason = prompt('Rejection reason:'); if (reason === null) return; const headers = await getAuthHeaders(); await fetch('/api/public/registrations', { method: 'POST', headers, body: JSON.stringify({ visit_id: reg.id, action: 'reject', reason }) }); window.location.reload() }} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 min-h-[36px]">Reject</button>
                              </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </motion.div>
             )}

             {/* Appointment Analytics */}
             {showAllSections && (
               <div className="space-y-6">
                 <h2 className="text-xl font-bold text-gray-900">Appointment Analytics</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                   <StatCard title="Today's Appointments" value={appointmentsToday.toString()} icon={Calendar} color="blue" onClick={() => router.push('/appointments')} />
                   <StatCard title="Arrived" value="0" icon={UserCheck} color="amber" onClick={() => router.push('/appointments?status=Arrived')} />
                   <StatCard title="Checked In" value="0" icon={CheckCircle} color="green" onClick={() => router.push('/appointments?status=Checked In')} />
                   <StatCard title="Completed" value="0" icon={CheckCircle2} color="green" onClick={() => router.push('/appointments?status=Completed')} />
                   <StatCard title="Cancelled" value="0" icon={XCircle} color="red" onClick={() => router.push('/appointments?status=Cancelled')} />
                   <StatCard title="No Shows" value="0" icon={XCircle} color="orange" onClick={() => router.push('/appointments?status=No Show')} />
                 </div>
               </div>
             )}

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

             {/* Assets & Property Analytics */}
             {showAllSections && (
               <div className="space-y-6">
                 <h2 className="text-xl font-bold text-gray-900">Assets & Property Analytics</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                   <StatCard title="Items Inside" value={propertyStats.itemsInside.toString()} icon={ShieldCheck} color="green" onClick={() => router.push('/assets')} />
                   <StatCard title="Confiscated" value={propertyStats.confiscatedItems.toString()} icon={AlertTriangle} color="red" onClick={() => router.push('/assets')} />
                   <StatCard title="Pending Release" value={propertyStats.pendingRelease.toString()} icon={Clock} color="amber" onClick={() => router.push('/assets')} />
                   <StatCard title="Released Today" value={propertyStats.releasedToday.toString()} icon={CheckCircle} color="blue" onClick={() => router.push('/assets')} />
                 </div>
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
