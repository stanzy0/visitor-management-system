'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole, PERMISSIONS } from '@/lib/auth'
import {
  Search,
  RefreshCw,
  Loader2,
  X,
  Eye,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'

interface EmailLog {
  id: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  template: string
  status: string
  error_message: string | null
  related_type: string | null
  related_id: string | null
  retry_count: number
  sent_at: string | null
  created_at: string
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user || user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchLogs()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query
    if (data) {
      const filtered = searchTerm
        ? data.filter(
            (log) =>
              log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.template.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : data
      setLogs(filtered)
    }
    setLoading(false)
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('email-logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_logs' },
        () => {
          fetchLogs()
        }
      )
      .subscribe()
  }

  const handleRetry = async (log: EmailLog) => {
    const { error } = await supabase
      .from('email_logs')
      .update({ status: 'pending', retry_count: 0, error_message: null })
      .eq('id', log.id)

    if (!error) {
      fetchLogs()
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
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
            <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
            <p className="text-sm text-gray-500">Monitor all outgoing emails</p>
          </div>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by recipient, subject, or template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Recipient</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Subject</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Template</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Retries</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Sent At</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{log.recipient_name || '—'}</p>
                          <p className="text-xs text-gray-500">{log.recipient_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.subject}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{log.template.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-50 text-green-700'
                              : log.status === 'failed'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {log.status === 'sent' && <CheckCircle className="h-3 w-3" />}
                          {log.status === 'failed' && <XCircle className="h-3 w-3" />}
                          {log.status === 'pending' && <Clock className="h-3 w-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.retry_count}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewLog(log)}
                            className="p-1 rounded-md hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          {(log.status === 'failed' || log.status === 'pending') && (
                            <button
                              onClick={() => handleRetry(log)}
                              className="p-1 rounded-md hover:bg-blue-50"
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && logs.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-500">No email logs found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewLog(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Email Details</h2>
              <button onClick={() => setPreviewLog(null)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Recipient</span>
                <p className="text-sm text-gray-900">{previewLog.recipient_name || '—'} &lt;{previewLog.recipient_email}&gt;</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Subject</span>
                <p className="text-sm text-gray-900">{previewLog.subject}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Template</span>
                <p className="text-sm text-gray-900 capitalize">{previewLog.template.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                <p className="text-sm text-gray-900 capitalize">{previewLog.status}</p>
              </div>
              {previewLog.error_message && (
                <div>
                  <span className="text-xs font-medium text-red-500 uppercase">Error</span>
                  <p className="text-sm text-red-600">{previewLog.error_message}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Created</span>
                <p className="text-sm text-gray-900">{new Date(previewLog.created_at).toLocaleString()}</p>
              </div>
              {previewLog.sent_at && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Sent At</span>
                  <p className="text-sm text-gray-900">{new Date(previewLog.sent_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
