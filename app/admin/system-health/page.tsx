'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { SystemHealthDetailed } from '@/lib/types/admin'
import { Loader2, RefreshCw, Database, Activity, HardDrive, Mail, QrCode, Printer, Bell } from 'lucide-react'

const SERVICE_ICONS: Record<string, React.ElementType> = {
  Supabase: Database,
  Database: Database,
  Realtime: Activity,
  Storage: HardDrive,
  'Email Service': Mail,
  'QR Service': QrCode,
  'Badge Service': Printer,
  'Notification Queue': Bell,
}

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  operational: { className: 'bg-green-50 text-green-700', label: 'Operational' },
  warning: { className: 'bg-amber-50 text-amber-700', label: 'Warning' },
  offline: { className: 'bg-red-50 text-red-700', label: 'Offline' },
}

export default function AdminSystemHealthPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [health, setHealth] = useState<SystemHealthDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchHealth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/system-health', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch system health')
      }

      setHealth(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load system health' })
    } finally {
      setLoading(false)
      setRefreshing(false)
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
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (userRole === 'Admin') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHealth()
    }
  }, [userRole])

  useEffect(() => {
    if (userRole !== 'Admin') return

    const interval = setInterval(() => {
      fetchHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [userRole])

  const handleRefresh = async () => {
    setRefreshing(true)
    setNotification(null)
    await fetchHealth()
    setNotification({ type: 'success', message: 'Health data refreshed' })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const operationalCount = health.filter((h) => h.status === 'operational').length
  const warningCount = health.filter((h) => h.status === 'warning').length
  const offlineCount = health.filter((h) => h.status === 'offline').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
            <p className="text-sm text-gray-500">Real-time monitoring of all system services</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-1">Operational</p>
                <p className="text-3xl font-bold text-green-700">{operationalCount}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-1">Warnings</p>
                <p className="text-3xl font-bold text-amber-700">{warningCount}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-1">Offline</p>
                <p className="text-3xl font-bold text-red-700">{offlineCount}</p>
              </div>
            </div>

            {health.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <RefreshCw className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No health data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {health.map((item) => {
                  const IconComponent = SERVICE_ICONS[item.service] || Database
                  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.operational

                  return (
                    <div
                      key={item.service}
                      className="rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-gray-50 p-2">
                          <IconComponent className="h-5 w-5 text-gray-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{item.service}</h3>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${statusConfig.className}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-4 space-y-1">
                        {item.latency && (
                          <p className="text-xs text-gray-500">Latency: {item.latency}</p>
                        )}
                        <p className="text-xs text-gray-500">Last checked: {formatTimestamp(item.last_checked)}</p>
                        {item.details && (
                          <p className="text-xs text-gray-600 mt-2">{item.details}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
