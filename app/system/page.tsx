'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts'
import {
  Database, Activity, Mail, HardDrive, Users, Calendar, Clock, FileText,
  ShieldAlert, Loader2, RefreshCw, Download, Printer, AlertTriangle,
  CheckCircle, XCircle, Server, Globe, Smartphone, Monitor,
  Trash2, Play, Eye, Search, Filter, ChevronDown, Bell,
  TrendingUp, TrendingDown, Minus, Zap, Cog, Lock,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

interface SystemKpis {
  databaseStatus: string
  supabaseConnection: string
  authStatus: string
  storageUsage: string
  activeVisitors: number
  activeAppointments: number
  activeBadges: number
  activeNotifications: number
  pendingDocumentReviews: number
  pendingOnlineRegistrations: number
  securityAlerts: number
  runningBackgroundJobs: number
}

interface SystemHealthScore {
  score: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  components: {
    database: number
    storage: number
    backgroundJobs: number
    apiResponse: number
    errorCount: number
    realtimeConnectivity: number
  }
}

const HEALTH_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  excellent: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  good: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  critical: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
}

export default function SystemDashboardPage() {
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [kpis, setKpis] = useState<SystemKpis | null>(null)
  const [healthScore, setHealthScore] = useState<SystemHealthScore | null>(null)
  const [exporting, setExporting] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

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
      setAuthChecking(false)
      fetchData()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system?section=dashboard')
      const json = await res.json()
      if (json.success) {
        setKpis(json.data.kpis)
        setHealthScore(json.data.healthScore)
      }
    } catch (err) {
      console.error('Error fetching system data:', err)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('system-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_badges' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_jobs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'error_tracking' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_logs' }, () => fetchData())
      .subscribe()
  }

  const exportHealthReport = () => {
    if (!kpis || !healthScore) return
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('System Health Report', 14, 20)
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
      doc.text(`Health Score: ${healthScore.score}% (${healthScore.status.toUpperCase()})`, 14, 34)

      autoTable(doc, {
        startY: 42,
        head: [['KPI', 'Value']],
        body: [
          ['Database Status', kpis.databaseStatus],
          ['Supabase Connection', kpis.supabaseConnection],
          ['Auth Status', kpis.authStatus],
          ['Storage Usage', kpis.storageUsage],
          ['Active Visitors', kpis.activeVisitors.toString()],
          ['Active Appointments', kpis.activeAppointments.toString()],
          ['Active Badges', kpis.activeBadges.toString()],
          ['Active Notifications', kpis.activeNotifications.toString()],
          ['Pending Document Reviews', kpis.pendingDocumentReviews.toString()],
          ['Pending Online Registrations', kpis.pendingOnlineRegistrations.toString()],
          ['Security Alerts', kpis.securityAlerts.toString()],
          ['Running Background Jobs', kpis.runningBackgroundJobs.toString()],
        ],
      })

      doc.save(`system-health-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Export error:', err)
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

  if (loading || !kpis || !healthScore) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const kpiCards = [
    { title: 'Active Visitors', value: kpis.activeVisitors, icon: Users, color: 'blue' },
    { title: 'Active Appointments', value: kpis.activeAppointments, icon: Calendar, color: 'purple' },
    { title: 'Active Badges', value: kpis.activeBadges, icon: ShieldAlert, color: 'amber' },
    { title: 'Active Notifications', value: kpis.activeNotifications, icon: Bell, color: 'red' },
    { title: 'Pending Doc Reviews', value: kpis.pendingDocumentReviews, icon: FileText, color: 'orange' },
    { title: 'Pending Registrations', value: kpis.pendingOnlineRegistrations, icon: Clock, color: 'indigo' },
    { title: 'Security Alerts', value: kpis.securityAlerts, icon: ShieldAlert, color: 'red' },
    { title: 'Running Jobs', value: kpis.runningBackgroundJobs, icon: Cog, color: 'green' },
  ]

  const healthStatus = HEALTH_COLORS[healthScore.status]
  const HealthIcon = healthStatus.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Monitoring & Maintenance Center</h1>
            <p className="text-sm text-gray-500">Real-time system health and operational visibility</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={exportHealthReport} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Download className="h-4 w-4" />
              Health Report
            </button>
          </div>
        </div>

        {/* System Health Score */}
        <div className={`rounded-xl border p-6 ${healthStatus.bg} ${healthStatus.text}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">System Health Score</h2>
              <p className="text-sm opacity-80">Overall system status</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{healthScore.score}%</p>
              <p className="text-sm font-medium capitalize">{healthScore.status}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(healthScore.components).map(([key, value]) => (
              <div key={key} className="bg-white/50 rounded-lg p-3">
                <p className="text-xs opacity-80 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-lg font-bold">{value}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Database Status</p>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-green-600 capitalize">{kpis.databaseStatus}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Supabase Connection</p>
              <Globe className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-green-600 capitalize">{kpis.supabaseConnection}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Auth Status</p>
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-green-600 capitalize">{kpis.authStatus}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Storage Usage</p>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">{kpis.storageUsage}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon
            const colorClasses: Record<string, string> = {
              blue: 'bg-blue-50 text-blue-600',
              green: 'bg-green-50 text-green-600',
              purple: 'bg-purple-50 text-purple-600',
              amber: 'bg-amber-50 text-amber-600',
              red: 'bg-red-50 text-red-600',
              orange: 'bg-orange-50 text-orange-600',
              indigo: 'bg-indigo-50 text-indigo-600',
            }
            return (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">{kpi.title}</p>
                  <div className={`p-2 rounded-lg ${colorClasses[kpi.color] || 'bg-gray-50 text-gray-600'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <QuickLink href="/system/database" label="Database Health" icon={Database} />
          <QuickLink href="/system/jobs" label="Background Jobs" icon={Cog} />
          <QuickLink href="/system/storage" label="Storage Monitor" icon={HardDrive} />
          <QuickLink href="/system/performance" label="Performance" icon={TrendingUp} />
          <QuickLink href="/system/errors" label="Error Center" icon={AlertTriangle} />
          <QuickLink href="/system/logs" label="System Logs" icon={FileText} />
        </div>
      </div>
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
