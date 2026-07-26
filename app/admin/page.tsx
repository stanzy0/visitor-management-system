'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Loader2, Users, Shield, Clock, UserCheck, Calendar, RefreshCw, AlertTriangle, Database, Activity, Mail, HardDrive } from 'lucide-react'

interface AdminDashboardData {
  stats: {
    totalUsers: number
    activeUsers: number
    lockedAccounts: number
    receptionists: number
    securityOfficers: number
    hostEmployees: number
    administrators: number
    visitorsToday: number
    activeVisits: number
    pendingRegistrations: number
    overstayedVisitors: number
  }
  health: {
    databaseStatus: string
    realtimeStatus: string
    emailStatus: string
    storageUsage: string
  }
}

export default function AdminDashboardPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/dashboard', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load dashboard' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      fetchData()

      realtimeChannel.current = supabase
        .channel('admin-dashboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchData())
        .subscribe()
    }

    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'bg-green-50 text-green-700'
      case 'error':
      case 'not_configured':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-amber-50 text-amber-700'
    }
  }

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy'
      case 'configured':
        return 'Configured'
      case 'error':
        return 'Error'
      case 'not_configured':
        return 'Not Configured'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">System administration and monitoring</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        {data && (
          <>
            {/* User Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={data.stats.totalUsers.toString()} icon={Users} color="blue" />
              <StatCard title="Active Users" value={data.stats.activeUsers.toString()} icon={UserCheck} color="green" />
              <StatCard title="Locked Accounts" value={data.stats.lockedAccounts.toString()} icon={AlertTriangle} color="red" />
              <StatCard title="Administrators" value={data.stats.administrators.toString()} icon={Shield} color="purple" />
              <StatCard title="Receptionists" value={data.stats.receptionists.toString()} icon={Users} color="blue" />
              <StatCard title="Security Officers" value={data.stats.securityOfficers.toString()} icon={Shield} color="amber" />
              <StatCard title="Host Employees" value={data.stats.hostEmployees.toString()} icon={Users} color="green" />
            </div>

            {/* Visitor Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Visitors Today" value={data.stats.visitorsToday.toString()} icon={Calendar} color="blue" />
              <StatCard title="Active Visits" value={data.stats.activeVisits.toString()} icon={UserCheck} color="green" />
              <StatCard title="Pending Registrations" value={data.stats.pendingRegistrations.toString()} icon={Clock} color="amber" />
              <StatCard title="Overstayed Visitors" value={data.stats.overstayedVisitors.toString()} icon={AlertTriangle} color="red" />
            </div>

            {/* System Health */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <HealthCard title="Database" status={data.health.databaseStatus} icon={Database} />
                <HealthCard title="Realtime" status={data.health.realtimeStatus} icon={Activity} />
                <HealthCard title="Email" status={data.health.emailStatus} icon={Mail} />
                <HealthCard title="Storage" status={data.health.storageUsage} icon={HardDrive} />
              </div>
            </div>
          </>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLink href="/admin/roles" label="Role Management" icon={Shield} />
          <QuickLink href="/admin/settings" label="System Settings" icon={Database} />
          <QuickLink href="/admin/email" label="Email Settings" icon={Mail} />
          <QuickLink href="/admin/backup" label="Backup" icon={HardDrive} />
          <QuickLink href="/admin/logs" label="System Logs" icon={Activity} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
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

function HealthCard({ title, status, icon: Icon }: { title: string; status: string; icon: React.ComponentType<{ className?: string }> }) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'bg-green-50 text-green-700'
      case 'error':
      case 'not_configured':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-amber-50 text-amber-700'
    }
  }

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy'
      case 'configured':
        return 'Configured'
      case 'error':
        return 'Error'
      case 'not_configured':
        return 'Not Configured'
      default:
        return status
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className={`mt-2 text-sm font-medium ${getHealthColor(status)}`}>{getHealthLabel(status)}</p>
    </div>
  )
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </a>
  )
}
