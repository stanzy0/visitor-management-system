'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import {
  Loader2, RefreshCw, Download, Shield, Database, HardDrive, Cog,
  Activity, AlertTriangle, CheckCircle, XCircle, Server, Clock,
  GitBranch, Package, FileDown, Settings, Monitor,
} from 'lucide-react'

interface Backup {
  id: string
  backup_type: string
  backup_size_bytes: number | null
  tables: string[] | null
  storage_size_bytes: number | null
  status: string
  checksum: string | null
  created_at: string
}

interface Deployment {
  id: string
  version: string
  commit_hash: string | null
  build_number: string | null
  environment: string
  status: string
  rolled_back: boolean
  deployed_at: string
}

interface MaintenanceMode {
  enabled: boolean
  message: string | null
  started_at: string | null
}

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

export default function DeploymentDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [backups, setBackups] = useState<Backup[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchData = async () => {
    setTimeout(() => setLoading(true), 0)
    try {
      const res = await fetch('/api/deployment?section=dashboard')
      const json = await res.json()
      if (json.success) {
        setBackups(json.data.backups)
        setDeployments(json.data.deployments)
        setMaintenance(json.data.maintenance)
        setSystemInfo(json.data.systemInfo)
      }
    } catch (err) {
      console.error('Error fetching deployment data:', err)
    } finally {
      setTimeout(() => setLoading(false), 0)
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
      setAuthChecking(false)
      fetchData()
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

  const totalBackupSize = backups.reduce((acc, b) => acc + (b.backup_size_bytes || 0), 0)
  const latestDeployment = deployments[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deployment & Recovery Center</h1>
            <p className="text-sm text-gray-500">Backup, restore, and deployment management</p>
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Maintenance Alert */}
        {maintenance?.enabled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Maintenance Mode Active</h3>
                <p className="text-sm text-amber-700">{maintenance.message || 'System is currently under maintenance'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Backups</p>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{backups.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Backup Storage</p>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">{(totalBackupSize / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Current Version</p>
              <GitBranch className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">{latestDeployment?.version || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Maintenance</p>
              <Settings className="h-4 w-4 text-gray-400" />
            </div>
            <p className={`mt-2 text-sm font-medium ${maintenance?.enabled ? 'text-red-600' : 'text-green-600'}`}>
              {maintenance?.enabled ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        {/* System Info */}
        {systemInfo && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              <InfoCard label="CPU Usage" value={systemInfo.cpu_usage_percent ? `${systemInfo.cpu_usage_percent.toFixed(1)}%` : 'N/A'} />
              <InfoCard label="Memory Usage" value={systemInfo.memory_usage_percent ? `${systemInfo.memory_usage_percent.toFixed(1)}%` : 'N/A'} />
              <InfoCard label="Disk Usage" value={systemInfo.disk_usage_percent ? `${systemInfo.disk_usage_percent.toFixed(1)}%` : 'N/A'} />
              <InfoCard label="Active Sessions" value={systemInfo.active_sessions?.toString() || 'N/A'} />
              <InfoCard label="Logged-in Users" value={systemInfo.logged_in_users?.toString() || 'N/A'} />
              <InfoCard label="API Response Time" value={systemInfo.api_response_time_ms ? `${systemInfo.api_response_time_ms}ms` : 'N/A'} />
              <InfoCard label="Realtime Status" value={systemInfo.realtime_status || 'N/A'} />
              <InfoCard label="Storage Usage" value={systemInfo.storage_usage_bytes ? `${(systemInfo.storage_usage_bytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'} />
              <InfoCard label="Database Size" value={systemInfo.database_size_bytes ? `${(systemInfo.database_size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'} />
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <QuickLink href="/deployment/backups" label="Backups" icon={Database} />
          <QuickLink href="/deployment/restore" label="Restore Center" icon={FileDown} />
          <QuickLink href="/deployment/maintenance" label="Maintenance Mode" icon={Settings} />
          <QuickLink href="/deployment/version" label="Version Management" icon={GitBranch} />
          <QuickLink href="/deployment/system-info" label="System Info" icon={Monitor} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
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
