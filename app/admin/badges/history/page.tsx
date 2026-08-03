'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Search, Download } from 'lucide-react'
import type { BadgeHistoryRecord } from '@/lib/badge/badge-types'

export default function AdminBadgeHistoryPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [history, setHistory] = useState<BadgeHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/badges/history?${params.toString()}`, { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch history')
      }

      setHistory(result.data)
    } catch (err) {
      console.error('Error fetching history:', err)
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
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (userRole === 'Admin') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, actionFilter, search])

  const handleExportCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (search) params.set('search', search)
      params.set('export', 'csv')

      const res = await fetch(`/api/admin/badges/history?${params.toString()}`, { headers })
      
      if (!res.ok) {
        throw new Error('Failed to export history')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `badge-history-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export history')
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'printed':
        return 'bg-blue-50 text-blue-700'
      case 'reprinted':
        return 'bg-purple-50 text-purple-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700'
      case 'revoked':
        return 'bg-red-50 text-red-700'
      case 'generated':
        return 'bg-green-50 text-green-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/admin/badges" className="text-sm text-blue-600 hover:underline">
            ← Back to Badge Designer
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Badge History</h1>
            <p className="text-sm text-gray-500">Track all badge activities</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="printed">Printed</option>
                <option value="reprinted">Reprinted</option>
                <option value="cancelled">Cancelled</option>
                <option value="revoked">Revoked</option>
                <option value="generated">Generated</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Badge ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Printer</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Template</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Performed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(record.action)}`}>
                        {record.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{record.badge_id}</td>
                    <td className="px-4 py-3 text-gray-600">{record.printer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{record.template_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{record.reason || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {record.created_at ? new Date(record.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No history found</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
