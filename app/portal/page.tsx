'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react'
import type { PortalVisit } from '@/lib/types/portal'

interface StatusStyle {
  bg: string
  text: string
  icon: React.ComponentType<{ className?: string }>
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  checked_in: { bg: 'bg-green-50', text: 'text-green-700', icon: ShieldCheck },
  checked_out: { bg: 'bg-gray-50', text: 'text-gray-700', icon: ShieldCheck },
  documents_verified: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle2 },
  badge_issued: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  security_cleared: { bg: 'bg-green-50', text: 'text-green-700', icon: ShieldCheck },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', icon: XCircle },
}

function renderStatusIcon(status: string) {
  const Icon = STATUS_STYLES[status]?.icon
  if (!Icon) return null
  return <Icon className="h-4 w-4" />
}

export default function PortalPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PortalVisit | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: searchTerm }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration not found')
        return
      }

      setResult(data.data)
      const portalToken = data.data?.badge?.qr_token || data.data?.registration_number
      if (portalToken) {
        window.location.href = `/portal/${portalToken}`
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Visitor Self-Service Portal</h1>
          <p className="text-gray-600 mt-2">Enter your registration number to view your visit status</p>
        </div>

        <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Registration Number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[52px]"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              View Registration
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Found</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Registration Number</p>
                  <p className="text-xl font-mono font-bold text-gray-900">{result.registration_number}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_STYLES[result.status]?.bg || 'bg-gray-50'} ${STATUS_STYLES[result.status]?.text || 'text-gray-700'}`}>
                  {renderStatusIcon(result.status)}
                  {result.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact reception at <a href="mailto:reception@afcsc.edu.ng" className="text-blue-600 hover:underline">reception@afcsc.edu.ng</a> or call +234 803 000 0000
          </p>
        </div>
      </div>
    </div>
  )
}
