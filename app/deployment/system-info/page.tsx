'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import {
  Loader2, RefreshCw, Cpu, MemoryStick, HardDrive, Activity, Users,
  Clock, Globe, Zap, Server, CheckCircle, XCircle, AlertTriangle, Database,
} from 'lucide-react'

interface SystemInfo {
  cpu_usage_percent: number | null
  memory_usage_percent: number | null
  disk_usage_percent: number | null
  storage_usage_bytes: number | null
  database_size_bytes: number | null
  realtime_status: string | null
  active_sessions: number | null
  logged_in_users: number | null
  api_response_time_ms: number | null
  checked_at: string
}

export default function SystemInfoPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchSystemInfo = async () => {
    setTimeout(() => setLoading(true), 0)
    try {
      const res = await fetch('/api/deployment?section=system-info')
      const json = await res.json()
      if (json.success) {
        setSystemInfo(json.data)
      }
    } catch (err) {
      console.error('Error fetching system info:', err)
    } finally {
      setTimeout(() => setLoading(false), 0)
    }
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
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
      setAuthChecking(false)
      fetchSystemInfo()
    }
    checkAuth()
  }, [])

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!systemInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">No system information available</p>
      </div>
    )
  }

  const resources = [
    { label: 'CPU Usage', value: systemInfo.cpu_usage_percent, unit: '%', icon: Cpu, color: 'blue' },
    { label: 'Memory Usage', value: systemInfo.memory_usage_percent, unit: '%', icon: MemoryStick, color: 'green' },
    { label: 'Disk Usage', value: systemInfo.disk_usage_percent, unit: '%', icon: HardDrive, color: 'amber' },
    { label: 'API Response Time', value: systemInfo.api_response_time_ms, unit: 'ms', icon: Zap, color: 'purple' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Information</h1>
            <p className="text-sm text-gray-500">Real-time system metrics and status</p>
          </div>
          <button onClick={fetchSystemInfo} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Resource Usage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resources.map((resource) => {
            const Icon = resource.icon
            return (
              <div key={resource.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">{resource.label}</p>
                  <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {resource.value !== null ? `${resource.value.toFixed(1)}${resource.unit}` : 'N/A'}
                </p>
                {resource.value !== null && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${resource.value > 80 ? 'bg-red-500' : resource.value > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(resource.value, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoCard label="Storage Usage" value={formatBytes(systemInfo.storage_usage_bytes)} icon={HardDrive} />
          <InfoCard label="Database Size" value={formatBytes(systemInfo.database_size_bytes)} icon={Database} />
          <InfoCard label="Active Sessions" value={systemInfo.active_sessions?.toString() || 'N/A'} icon={Users} />
          <InfoCard label="Logged-in Users" value={systemInfo.logged_in_users?.toString() || 'N/A'} icon={Users} />
          <InfoCard label="Realtime Status" value={systemInfo.realtime_status || 'N/A'} icon={Globe} />
          <InfoCard label="Last Checked" value={systemInfo.checked_at ? new Date(systemInfo.checked_at).toLocaleString() : 'N/A'} icon={Clock} />
        </div>

        {/* Status Indicators */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatusItem label="CPU" status={systemInfo.cpu_usage_percent && systemInfo.cpu_usage_percent > 80 ? 'warning' : 'healthy'} />
            <StatusItem label="Memory" status={systemInfo.memory_usage_percent && systemInfo.memory_usage_percent > 80 ? 'warning' : 'healthy'} />
            <StatusItem label="Disk" status={systemInfo.disk_usage_percent && systemInfo.disk_usage_percent > 80 ? 'warning' : 'healthy'} />
            <StatusItem label="Realtime" status={systemInfo.realtime_status === 'connected' ? 'healthy' : 'error'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  const colors = {
    healthy: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className={`rounded-lg border p-3 ${colors[status as keyof typeof colors] || colors.healthy}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">{label}</p>
        {status === 'healthy' ? <CheckCircle className="h-4 w-4" /> : status === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <p className="text-xs mt-1 capitalize">{status}</p>
    </div>
  )
}
