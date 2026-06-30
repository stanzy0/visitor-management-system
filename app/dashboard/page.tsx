'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole, PERMISSIONS } from '@/lib/auth'
import NotificationBell from '@/components/NotificationBell'
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
} from 'lucide-react'

interface Stats {
  totalEmployees: number
  totalVisitors: number
  pendingVisits: number
  approvedVisits: number
  checkedInVisits: number
  checkedOutVisits: number
  todaysVisitors: number
  watchlistHitsToday: number
  activeWatchlist: number
  vipOnSite: number
  documentsVerifiedToday: number
  pendingDocumentVerification: number
  expiredDocuments: number
}

interface RecentNotification {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  is_read: boolean
}

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard' },
      { label: 'Reception Kiosk', icon: Monitor, href: '/kiosk', permission: 'dashboard' },
      { label: 'Visitors', icon: Users, href: '/visitors', permission: 'visitors' },
      { label: 'Appointments', icon: Calendar, href: '/appointments', permission: 'appointments' },
      { label: 'Visits', icon: Clock, href: '/visits', permission: 'visits' },
      { label: 'QR Scanner', icon: Scan, href: '/scanner', permission: 'scanner' },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      { label: 'Watchlist', icon: ShieldAlert, href: '/watchlist', permission: 'watchlist' },
      { label: 'ID Verification', icon: FileText, href: '/documents', permission: 'documents' },
      { label: 'Emergency Occupancy', icon: AlertTriangle, href: '/emergency', permission: 'emergency' },
      { label: 'Host Portal', icon: Users, href: '/host', permission: 'host' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { label: 'Employees', icon: UserCheck, href: '/employees', permission: 'employees' },
      { label: 'Office Locations', icon: Building2, href: '/office-locations', permission: 'settings' },
      { label: 'Vehicle Management', icon: Car, href: '/vehicles', permission: 'vehicles' },
      { label: 'Users', icon: Users, href: '/users', permission: 'users' },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { label: 'Notifications', icon: Bell, href: '/notifications', permission: 'dashboard' },
      { label: 'Audit Logs', icon: ShieldCheck, href: '/audit-logs', permission: 'audit-logs' },
      { label: 'Reports', icon: FileText, href: '/reports', permission: 'reports' },
      { label: 'Analytics', icon: BarChart3, href: '/analytics', permission: 'analytics' },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { label: 'Settings', icon: Settings, href: '/settings', permission: 'settings' },
    ],
  },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    totalVisitors: 0,
    pendingVisits: 0,
    approvedVisits: 0,
    checkedInVisits: 0,
    checkedOutVisits: 0,
    todaysVisitors: 0,
    watchlistHitsToday: 0,
    activeWatchlist: 0,
    vipOnSite: 0,
    documentsVerifiedToday: 0,
    pendingDocumentVerification: 0,
    expiredDocuments: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [userEmail, setUserEmail] = useState('')
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([])
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserRole(user.role)
      setUserEmail(user.email)
      setAuthChecking(false)
      await fetchStats()
      await fetchRecentNotifications()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    const today = new Date().toISOString().split('T')[0]

    const [employeesRes, visitorsRes, pendingRes, approvedRes, checkedInRes, checkedOutRes, todaysRes, watchlistHitsRes, activeWatchlistRes, vipOnSiteRes, docsVerifiedRes, docsPendingRes, docsExpiredRes] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact' }),
      supabase.from('visitors').select('id', { count: 'exact' }),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_out'),
      supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', today),
      supabase.from('notifications').select('id', { count: 'exact' }).eq('type', 'watchlist_match').gte('created_at', today),
      supabase.from('visitor_watchlist').select('id', { count: 'exact' }).eq('status', 'Active'),
      supabase.from('visitor_watchlist').select('id', { count: 'exact' }).eq('status', 'Active').eq('category', 'VIP'),
      supabase.from('visitor_documents').select('id', { count: 'exact' }).eq('verified', true).gte('verification_date', today),
      supabase.from('visitor_documents').select('id', { count: 'exact' }).eq('verified', false),
      supabase.from('visitor_documents').select('id', { count: 'exact' }).lt('expiry_date', new Date().toISOString().split('T')[0]),
    ])

    setStats({
      totalEmployees: employeesRes.count ?? 0,
      totalVisitors: visitorsRes.count ?? 0,
      pendingVisits: pendingRes.count ?? 0,
      approvedVisits: approvedRes.count ?? 0,
      checkedInVisits: checkedInRes.count ?? 0,
      checkedOutVisits: checkedOutRes.count ?? 0,
      todaysVisitors: todaysRes.count ?? 0,
      watchlistHitsToday: watchlistHitsRes.count ?? 0,
      activeWatchlist: activeWatchlistRes.count ?? 0,
      vipOnSite: vipOnSiteRes.count ?? 0,
      documentsVerifiedToday: docsVerifiedRes.count ?? 0,
      pendingDocumentVerification: docsPendingRes.count ?? 0,
      expiredDocuments: docsExpiredRes.count ?? 0,
    })
    setLoadingStats(false)
  }

  const fetchRecentNotifications = async () => {
    const user = await getCurrentUser()
    if (!user) return
    const { data: userRoleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5)
    if (userRoleData?.role) {
      query = query.or(`user_id.eq.${user.id},recipient_role.eq.${userRoleData.role}`)
    }
    const { data } = await query
    if (data) {
      setRecentNotifications(data as RecentNotification[])
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchRecentNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_watchlist' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_documents' }, () => fetchStats())
      .subscribe()
  }

  const getNavItems = (sectionItems: typeof NAV_SECTIONS[0]['items']) =>
    sectionItems.filter(item => PERMISSIONS[userRole]?.includes(item.permission))

  const statCards = [
    { title: "Today's Visitors", value: stats.todaysVisitors.toString(), trend: 'up' as const, icon: Users },
    { title: 'Checked In', value: stats.checkedInVisits.toString(), trend: 'up' as const, icon: UserCheck },
    { title: 'Checked Out', value: stats.checkedOutVisits.toString(), trend: 'down' as const, icon: LogOut },
    { title: 'Pending Approvals', value: stats.pendingVisits.toString(), trend: 'neutral' as const, icon: Clock },
    { title: 'Total Employees', value: stats.totalEmployees.toString(), trend: 'up' as const, icon: ShieldCheck },
    { title: 'Watchlist Hits Today', value: stats.watchlistHitsToday.toString(), trend: 'neutral' as const, icon: ShieldAlert },
    { title: 'Active Watchlist', value: stats.activeWatchlist.toString(), trend: 'neutral' as const, icon: ShieldAlert },
    { title: 'VIP On Site', value: stats.vipOnSite.toString(), trend: 'up' as const, icon: Crown },
    { title: 'Docs Verified Today', value: stats.documentsVerifiedToday.toString(), trend: 'up' as const, icon: FileText },
    { title: 'Pending Verification', value: stats.pendingDocumentVerification.toString(), trend: 'neutral' as const, icon: FileText },
    { title: 'Expired Documents', value: stats.expiredDocuments.toString(), trend: 'down' as const, icon: FileText },
  ]

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 flex-shrink-0">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">VMS Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {NAV_SECTIONS.map((section) => {
            const items = getNavItems(section.items)
            if (items.length === 0) return null
            return (
              <div key={section.title} className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard Overview</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">
                {userRole.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => {
                const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus
                const trendColors = {
                  up: 'text-green-600 bg-green-50',
                  down: 'text-red-600 bg-red-50',
                  neutral: 'text-amber-600 bg-amber-50',
                }
                return (
                  <div key={stat.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <div className="p-2 rounded-lg bg-blue-50">
                        <stat.icon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{loadingStats ? '...' : stat.value}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendColors[stat.trend]}`}>
                        <TrendIcon className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

          {recentNotifications.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notif) => (
                  <div key={notif.id} className={`p-4 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}>
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}