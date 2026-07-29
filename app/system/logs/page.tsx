'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, RefreshCw, Download, FileText, Search, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface SystemLog {
  id: string
  module: string
  severity: string
  action: string
  description: string
  user_email: string | null
  ip_address: string | null
  resolved: boolean
  created_at: string
}

export default function SystemLogsPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState({
    module: '',
    severity: '',
    user_email: '',
    date_from: '',
    date_to: '',
    action: '',
  })
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
      setAuthChecking(false)
      fetchLogs()
    }
    checkAuth()
  }, [filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.module) params.set('module', filters.module)
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.user_email) params.set('user_email', filters.user_email)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)
      if (filters.action) params.set('action', filters.action)

      const res = await fetch(`/api/system?section=logs&${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('System Logs Report', 14, 20)
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

      autoTable(doc, {
        startY: 36,
        head: [['Time', 'Module', 'Severity', 'Action', 'Description', 'User']],
        body: logs.map(l => [
          new Date(l.created_at).toLocaleString(),
          l.module,
          l.severity,
          l.action,
          l.description,
          l.user_email || 'N/A',
        ]),
      })

      doc.save(`system-logs-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportCSV = () => {
    setExporting(true)
    try {
      const rows = [
        ['Time', 'Module', 'Severity', 'Action', 'Description', 'User', 'IP'],
        ...logs.map(l => [
          new Date(l.created_at).toLocaleString(),
          l.module,
          l.severity,
          l.action,
          l.description,
          l.user_email || '',
          l.ip_address || '',
        ]),
      ]
      const csv = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    error: 'bg-orange-100 text-orange-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800',
  }

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
            <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
            <p className="text-sm text-gray-500">Searchable system activity logs</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportPDF} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button onClick={exportCSV} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button onClick={fetchLogs} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <input
                type="text"
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Module"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <input
                type="text"
                value={filters.user_email}
                onChange={(e) => setFilters({ ...filters, user_email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="User email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Action"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Logs ({logs.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Module</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Severity</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No logs found</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{log.module}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[log.severity] || 'bg-gray-100 text-gray-800'}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3 text-gray-600">{log.user_email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
