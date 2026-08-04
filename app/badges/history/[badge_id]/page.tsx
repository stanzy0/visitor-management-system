'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, RefreshCw, Download, ChevronLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import type { BadgeScanLog, ScanHistoryResponse, VerificationResult } from '@/lib/types/badge-scan'

const RESULT_STYLES: Record<VerificationResult, string> = {
  VALID: 'bg-green-100 text-green-800',
  INVALID: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-amber-100 text-amber-800',
  REVOKED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-amber-100 text-amber-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
}

export default function BadgeScanHistoryPage() {
  const params = useParams()
  const badge_id = params.badge_id as string

  const [history, setHistory] = useState<ScanHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    verification_result: '',
    date_from: '',
    date_to: '',
  })

  const fetchHistory = useCallback(async () => {
    try {
      setRefreshing(true)
      const searchParams = new URLSearchParams()
      searchParams.set('badge_id', badge_id)
      if (filters.verification_result) searchParams.set('verification_result', filters.verification_result)
      if (filters.date_from) searchParams.set('date_from', filters.date_from)
      if (filters.date_to) searchParams.set('date_to', filters.date_to)

      const res = await fetch(`/api/badges/scan-history?${searchParams.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setHistory(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [badge_id, filters])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const exportCSV = () => {
    if (!history?.data.length) return

    const headers = ['Scan Time', 'Result', 'Scanner', 'Device', 'Location', 'IP Address']
    const rows = history.data.map(log => [
      log.scanned_at,
      log.verification_result,
      log.scanner_name || '',
      log.device_name || '',
      log.location || '',
      log.ip_address || '',
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `badge-${badge_id}-scan-history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading scan history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <a href={`/visitors/${badge_id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ChevronLeft className="h-4 w-4" /> Back
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Badge Scan History</h1>
              <p className="text-sm text-gray-500">Badge ID: {badge_id}</p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            disabled={!history?.data.length}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
              <select
                value={filters.verification_result}
                onChange={(e) => setFilters({ ...filters, verification_result: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="VALID">Valid</option>
                <option value="INVALID">Invalid</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchHistory}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Scan Time</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Result</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Scanner</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Device</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Location</th>
                  <th className="px-6 py-3 font-medium text-gray-500">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history?.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No scan records found
                    </td>
                  </tr>
                )}
                {history?.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {new Date(log.scanned_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_STYLES[log.verification_result] || RESULT_STYLES.UNKNOWN}`}>
                        {log.verification_result === 'VALID' && <ShieldCheck className="h-3 w-3" />}
                        {log.verification_result === 'INVALID' && <AlertTriangle className="h-3 w-3" />}
                        {log.verification_result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{log.scanner_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{log.device_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{log.location || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history && history.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <p className="text-sm text-gray-500">
                Showing {(history.page - 1) * history.limit + 1} to {Math.min(history.page * history.limit, history.total)} of {history.total} records
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters })}
                  disabled={history.page <= 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters })}
                  disabled={history.page >= history.totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
