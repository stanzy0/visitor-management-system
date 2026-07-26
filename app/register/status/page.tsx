'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, QrCode, UserCheck, ShieldCheck } from 'lucide-react'

interface VisitStatus {
  registration_number: string
  status: string
  visitor_name: string
  visit_date: string
  host_name: string
  department: string
  office_location: string
  badge_number?: string
  qr_token?: string
  check_in_time?: string
  check_out_time?: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  checked_in: { bg: 'bg-green-50', text: 'text-green-700', icon: UserCheck },
  checked_out: { bg: 'bg-gray-50', text: 'text-gray-700', icon: ShieldCheck },
}

export default function RegisterStatusPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VisitStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/public/status?q=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration not found')
        return
      }

      setResult(data.data)
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
          <h1 className="text-3xl font-bold text-gray-900">Check Registration Status</h1>
          <p className="text-gray-600 mt-2">Enter your registration number or QR code to check your status</p>
        </div>

        <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Registration Number or QR Code"
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
              Check Status
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
                  {(() => { const Icon = STATUS_STYLES[result.status]?.icon; return Icon ? <Icon className="h-4 w-4" /> : null })()}
                  {result.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Visitor Name</p>
                  <p className="text-sm font-medium text-gray-900">{result.visitor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Visit Date</p>
                  <p className="text-sm font-medium text-gray-900">{result.visit_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Host</p>
                  <p className="text-sm font-medium text-gray-900">{result.host_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-sm font-medium text-gray-900">{result.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Office Location</p>
                  <p className="text-sm font-medium text-gray-900">{result.office_location}</p>
                </div>
                {result.badge_number && (
                  <div>
                    <p className="text-sm text-gray-500">Badge Number</p>
                    <p className="text-sm font-medium text-gray-900">{result.badge_number}</p>
                  </div>
                )}
                {result.check_in_time && (
                  <div>
                    <p className="text-sm text-gray-500">Check-In Time</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(result.check_in_time).toLocaleString()}</p>
                  </div>
                )}
                {result.check_out_time && (
                  <div>
                    <p className="text-sm text-gray-500">Check-Out Time</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(result.check_out_time).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {result.qr_token && (
                <div className="flex flex-col items-center pt-4 border-t border-gray-200">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.qr_token)}`} alt="QR Code" className="h-40 w-40 mb-2" />
                  <p className="text-sm text-gray-500">Present this QR code at the gate</p>
                </div>
              )}

              {result.status === 'approved' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-800">
                    <strong>Your registration has been approved.</strong> Please arrive at the scheduled time and present your QR code at the gate.
                  </p>
                </div>
              )}

              {result.status === 'rejected' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    <strong>Your registration has been rejected.</strong> Please contact the reception desk for more information.
                  </p>
                </div>
              )}
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
