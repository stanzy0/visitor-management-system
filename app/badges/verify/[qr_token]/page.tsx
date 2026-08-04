'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import type { BadgeVerificationResponse, VerificationResult } from '@/lib/types/badge-scan'

const STATUS_STYLES: Record<VerificationResult, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  VALID: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  INVALID: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  EXPIRED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  REVOKED: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  SUSPENDED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  UNKNOWN: { bg: 'bg-gray-50', text: 'text-gray-700', icon: ShieldCheck },
}

export default function BadgeVerifyPage() {
  const params = useParams()
  const router = useRouter()
  const qr_token = params.qr_token as string

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<BadgeVerificationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const hasVerified = useRef(false)

  const verifyBadge = useCallback(async () => {
    if (!qr_token || hasVerified.current) return

    try {
      setRefreshing(true)
      const res = await fetch(`/api/badges/verify/${encodeURIComponent(qr_token)}`)
      const data = await res.json()
      setResult(data)

      if (!res.ok || !data.valid) {
        setError(data.message || 'Verification failed')
      } else {
        setError(null)
      }

      hasVerified.current = true
    } catch {
      setError('Failed to verify badge')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [qr_token])

  useEffect(() => {
    if (qr_token) {
      verifyBadge()
    }
  }, [qr_token, verifyBadge])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying badge...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 lg:px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">INVALID BADGE</h1>
            <p className="text-gray-600 mb-6">{error || 'Badge verification failed'}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[result.status] || STATUS_STYLES.UNKNOWN
  const StatusIcon = statusStyle.icon

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 lg:px-6">
        <div className={`rounded-2xl border-2 p-8 text-center ${statusStyle.bg} ${statusStyle.text}`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <StatusIcon className="h-12 w-12" />
            <h1 className="text-4xl font-bold tracking-tight">{result.status}</h1>
          </div>
          {result.message && <p className="text-lg opacity-90">{result.message}</p>}
          {result.duplicate && (
            <p className="text-sm mt-2 opacity-75">Duplicate scan detected — last scanned at {result.last_scanned_at ? new Date(result.last_scanned_at).toLocaleTimeString() : 'recently'}</p>
          )}
        </div>

        {result.visitor && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  {result.visitor.photo_url ? (
                    <img src={result.visitor.photo_url} alt={result.visitor.full_name} className="h-24 w-24 rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                      <span className="text-3xl text-gray-500">{(result.visitor.full_name || 'V').charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{result.visitor.full_name}</h2>
                  <p className="text-gray-600 mt-1">{result.visitor.visitor_organization || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Badge Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Badge Number</p><p className="text-sm font-medium text-gray-900">{result.badge?.badge_number || '—'}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><p className="text-sm font-medium text-gray-900">{result.badge?.badge_status || '—'}</p></div>
            <div><p className="text-sm text-gray-500">Issued At</p><p className="text-sm font-medium text-gray-900">{result.badge?.issued_at ? new Date(result.badge.issued_at).toLocaleString() : 'N/A'}</p></div>
            <div><p className="text-sm text-gray-500">Expires At</p><p className="text-sm font-medium text-gray-900">{result.badge?.expires_at ? new Date(result.badge.expires_at).toLocaleString() : 'N/A'}</p></div>
          </div>
        </div>

        {result.visit && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Visit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Registration Number</p><p className="text-sm font-medium text-gray-900 font-mono">{result.visit.registration_number}</p></div>
              <div><p className="text-sm text-gray-500">Visit Status</p><p className="text-sm font-medium text-gray-900 capitalize">{result.visit.status.replace('_', ' ')}</p></div>
              <div><p className="text-sm text-gray-500">Purpose</p><p className="text-sm font-medium text-gray-900">{result.visit.purpose || '—'}</p></div>
              <div><p className="text-sm text-gray-500">Check-in Time</p><p className="text-sm font-medium text-gray-900">{result.visit.check_in_time ? new Date(result.visit.check_in_time).toLocaleString() : 'Not checked in'}</p></div>
              <div><p className="text-sm text-gray-500">Check-out Time</p><p className="text-sm font-medium text-gray-900">{result.visit.check_out_time ? new Date(result.visit.check_out_time).toLocaleString() : 'Not checked out'}</p></div>
            </div>
          </div>
        )}

        {result.employee && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Host Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Host Name</p><p className="text-sm font-medium text-gray-900">{result.employee.full_name}</p></div>
              <div><p className="text-sm text-gray-500">Department</p><p className="text-sm font-medium text-gray-900">{result.employee.department || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Office Location</p><p className="text-sm font-medium text-gray-900">{result.employee.office_location || 'N/A'}</p></div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={verifyBadge}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
