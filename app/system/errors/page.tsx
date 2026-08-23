'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Search, Filter } from 'lucide-react'

interface SystemError {
  id: string
  error_type: string
  module: string
  severity: string
  message: string
  stack_trace: string | null
  user_email: string | null
  ip_address: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function ErrorCenterPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [errors, setErrors] = useState<SystemError[]>([])
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved')
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const resolvedParam = filter === 'all' ? '' : filter === 'resolved' ? 'true' : 'false'
      const url = resolvedParam ? `/api/system?section=errors&resolved=${resolvedParam}` : '/api/system?section=errors'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setErrors(json.data)
      }
    } catch (err) {
      console.error('Error fetching errors:', err)
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
      fetchErrors()
    }
    checkAuth()
  }, [filter])

  const markResolved = async (errorId: string) => {
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_error_resolved', error_id: errorId }),
      })
      fetchErrors()
    } catch (err) {
      console.error('Error marking resolved:', err)
    }
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    error: 'bg-orange-100 text-orange-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800',
  }

  const moduleCounts = errors.reduce((acc, e) => {
    acc[e.module] = (acc[e.module] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F08] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F08]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Error Center</h1>
            <p className="text-sm text-[#9A9F87]">Track and resolve system errors</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'resolved' | 'unresolved')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Errors</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
            <button onClick={fetchErrors} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#9A9F87] hover:bg-[#4B5320]/10">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 shadow-sm">
            <p className="text-sm font-medium text-[#9A9F87]">Total Errors</p>
            <p className="mt-2 text-2xl font-bold text-[#F5F5DC]">{errors.length}</p>
          </div>
          <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 shadow-sm">
            <p className="text-sm font-medium text-[#9A9F87]">Unresolved</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{errors.filter(e => !e.resolved).length}</p>
          </div>
          <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 shadow-sm">
            <p className="text-sm font-medium text-[#9A9F87]">Critical</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{errors.filter(e => e.severity === 'critical').length}</p>
          </div>
          <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 shadow-sm">
            <p className="text-sm font-medium text-[#9A9F87]">Modules Affected</p>
            <p className="mt-2 text-2xl font-bold text-[#F5F5DC]">{Object.keys(moduleCounts).length}</p>
          </div>
        </div>

        {/* Errors by Module Chart */}
        {Object.keys(moduleCounts).length > 0 && (
          <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm">
            <div className="p-4 border-b border-[rgba(85,107,47,0.35)]">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">Errors by Module</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(moduleCounts).map(([module, count]) => ({ module, count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="module" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Errors List */}
        <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm">
          <div className="p-4 border-b border-[rgba(85,107,47,0.35)]">
            <h3 className="text-lg font-semibold text-[#F5F5DC]">Error List</h3>
          </div>
          <div className="divide-y divide-[rgba(85,107,47,0.25)]">
            {errors.length === 0 && (
              <div className="p-8 text-center text-[#9A9F87]">No errors found</div>
            )}
            {errors.map((error) => (
              <div key={error.id} className="p-4 hover:bg-[#4B5320]/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[error.severity] || 'bg-gray-100 text-[#F5F5DC]'}`}>
                        {error.severity}
                      </span>
                      <span className="text-sm font-medium text-[#F5F5DC]">{error.module}</span>
                      <span className="text-xs text-[#9A9F87]">{error.error_type}</span>
                    </div>
                    <p className="text-sm text-[#9A9F87] mt-1">{error.message}</p>
                    <p className="text-xs text-[#9A9F87] mt-1">
                      {new Date(error.created_at).toLocaleString()}
                      {error.user_email && ` | ${error.user_email}`}
                    </p>
                    {error.stack_trace && (
                      <details className="mt-2">
                        <summary className="text-xs text-[#9A9F87] cursor-pointer">Stack Trace</summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{error.stack_trace}</pre>
                      </details>
                    )}
                  </div>
                  {!error.resolved && (
                    <button
                      onClick={() => markResolved(error.id)}
                      className="ml-4 inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


