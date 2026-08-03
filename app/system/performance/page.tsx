'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Loader2, RefreshCw, TrendingUp, Clock, Zap, Activity, Timer, Database, Users, Printer, FileText, Calendar } from 'lucide-react'

interface PerformanceMetric {
  id: string
  metric_name: string
  metric_type: string
  value_ms: number
  metadata: Record<string, unknown>
  created_at: string
}

const METRIC_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  api_response_time: { label: 'API Response Time', color: '#3b82f6', icon: Activity },
  page_load_time: { label: 'Page Load Time', color: '#10b981', icon: TrendingUp },
  db_query_time: { label: 'Database Query Time', color: '#f59e0b', icon: Database },
  realtime_latency: { label: 'Realtime Latency', color: '#8b5cf6', icon: Clock },
  registration_time: { label: 'Registration Time', color: '#ec4899', icon: Users },
  badge_generation_time: { label: 'Badge Generation Time', color: '#14b8a6', icon: Printer },
  document_verification_time: { label: 'Document Verification Time', color: '#f97316', icon: FileText },
  appointment_processing_time: { label: 'Appointment Processing Time', color: '#6366f1', icon: Calendar },
}

export default function PerformancePage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>('all')
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const url = selectedMetric === 'all'
        ? '/api/system?section=performance'
        : `/api/system?section=performance&metric=${selectedMetric}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setMetrics(json.data)
      }
    } catch (err) {
      console.error('Error fetching performance metrics:', err)
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
      setAuthChecking(false)
      fetchMetrics()
    }
    checkAuth()
  }, [selectedMetric])

  const chartData = metrics.map(m => ({
    ...m,
    time: new Date(m.created_at).toLocaleTimeString(),
  }))

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Monitoring</h1>
            <p className="text-sm text-gray-500">Track system performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Metrics</option>
              {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <button onClick={fetchMetrics} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {selectedMetric === 'all' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(METRIC_CONFIG).map(([key, config]) => {
              const latest = metrics.find(m => m.metric_name === key)
              const Icon = config.icon
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500">{config.label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{latest ? `${latest.value_ms}ms` : 'N/A'}</p>
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedMetric === 'all' ? 'All Metrics' : METRIC_CONFIG[selectedMetric]?.label || 'Performance'}
            </h3>
          </div>
          <div className="p-4">
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No performance data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {selectedMetric === 'all' ? (
                    Object.entries(METRIC_CONFIG).map(([key, config]) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey="value_ms"
                        data={chartData.filter(m => m.metric_name === key)}
                        name={config.label}
                        stroke={config.color}
                        strokeWidth={2}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value_ms"
                      stroke={METRIC_CONFIG[selectedMetric]?.color || '#3b82f6'}
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
