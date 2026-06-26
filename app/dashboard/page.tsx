'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Visitors', icon: Users, href: '/visitors' },
  { label: 'Visits', icon: Clock, href: '/visits' },
  { label: 'Employees', icon: UserCheck, href: '/employees' },
  { label: 'Reports', icon: FileText, href: '/reports' },
  { label: 'Audit Logs', icon: ShieldCheck, href: '/audit-logs' },
  { label: 'QR Scanner', icon: Scan, href: '/scanner' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

interface Stats {
  totalEmployees: number
  totalVisitors: number
  pendingVisits: number
  approvedVisits: number
  checkedInVisits: number
  checkedOutVisits: number
  todaysVisitors: number
}

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
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      fetchStats()
    }
    checkAuth()
  }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    const today = new Date().toISOString().split('T')[0]

    const [employeesRes, visitorsRes, pendingRes, approvedRes, checkedInRes, checkedOutRes, todaysRes] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact' }),
      supabase.from('visitors').select('id', { count: 'exact' }),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_out'),
      supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', today),
    ])

    setStats({
      totalEmployees: employeesRes.count ?? 0,
      totalVisitors: visitorsRes.count ?? 0,
      pendingVisits: pendingRes.count ?? 0,
      approvedVisits: approvedRes.count ?? 0,
      checkedInVisits: checkedInRes.count ?? 0,
      checkedOutVisits: checkedOutRes.count ?? 0,
      todaysVisitors: todaysRes.count ?? 0,
    })
    setLoadingStats(false)
  }

  const statCards = [
    { title: "Today's Visitors", value: stats.todaysVisitors.toString(), trend: 'up' as const, icon: Users },
    { title: 'Checked In', value: stats.checkedInVisits.toString(), trend: 'up' as const, icon: UserCheck },
    { title: 'Checked Out', value: stats.checkedOutVisits.toString(), trend: 'down' as const, icon: LogOut },
    { title: 'Pending Approvals', value: stats.pendingVisits.toString(), trend: 'neutral' as const, icon: Clock },
    { title: 'Total Employees', value: stats.totalEmployees.toString(), trend: 'up' as const, icon: ShieldCheck },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-200">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">VMS Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
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
          <div className="mt-8 pt-4 border-t border-gray-200">
            <a href="/login" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="h-5 w-5" />
              Logout
            </a>
          </div>
        </nav>
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
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">admin@company.com</p>
              <p className="text-xs text-gray-500">System Administrator</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">A</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          </div>
        </main>
      </div>
    </div>
  )
}