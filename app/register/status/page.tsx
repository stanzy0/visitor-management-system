'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, QrCode, UserCheck, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

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

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Pending' },
  approved: { bg: 'bg-[#0B3D91]/10', text: 'text-[#0B3D91]', icon: CheckCircle2, label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
  checked_in: { bg: 'bg-[#4DA6FF]/10', text: 'text-[#4DA6FF]', icon: UserCheck, label: 'Checked In' },
  checked_out: { bg: 'bg-gray-50', text: 'text-gray-700', icon: ShieldCheck, label: 'Checked Out' },
}

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Registration Submitted', icon: Clock },
  { key: 'pending', label: 'Pending Review', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'badge', label: 'Badge Generated', icon: QrCode },
  { key: 'checked_in', label: 'Checked In', icon: UserCheck },
  { key: 'checked_out', label: 'Checked Out', icon: ShieldCheck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
]

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

  const getCurrentStepIndex = (status: string) => {
    const statusMap: Record<string, number> = {
      pending: 1,
      approved: 2,
      badge: 2,
      checked_in: 3,
      checked_out: 4,
      completed: 5,
    }
    return statusMap[status] ?? 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0B3D91] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">
              <Image
                src="/images/afcsc-logo.png"
                alt="AFCSC Logo"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                priority
              />
            </div>
            <div className="text-center px-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Check Registration Status</h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">Armed Forces Command and Staff College</p>
              <p className="text-xs text-gray-400">Kaduna, Nigeria</p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src="/images/afcsc-logo.png"
                alt="AFCSC Logo"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 lg:px-6 py-8">
        <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Registration Number or Email Address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B3D91] px-6 py-3 text-sm font-medium text-white hover:bg-[#4DA6FF] disabled:opacity-50 min-h-[52px] transition-colors"
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
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#0B3D91] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Registration Number</p>
                    <p className="text-xl font-mono font-bold text-white">{result.registration_number}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_STYLES[result.status]?.bg || 'bg-gray-50'} ${STATUS_STYLES[result.status]?.text || 'text-gray-700'}`}>
                    {(() => { const Icon = STATUS_STYLES[result.status]?.icon; return Icon ? <Icon className="h-4 w-4" /> : null })()}
                    {STATUS_STYLES[result.status]?.label || result.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-6">
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
                  <div className="flex flex-col items-center pt-6 border-t border-gray-200 mt-6">
                    <div className="rounded-xl border-2 border-[#0B3D91] p-4 bg-white">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/portal/${encodeURIComponent(result.qr_token)}`)}`} alt="QR Code" className="h-40 w-40" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Present this QR code at the gate</p>
                  </div>
                )}

                {result.status === 'approved' && (
                  <div className="rounded-xl border border-[#0B3D91]/20 bg-[#0B3D91]/5 p-4 mt-4">
                    <p className="text-sm text-[#0B3D91]">
                      <strong>Your registration has been approved.</strong> Please arrive at the scheduled time and present your QR code at the gate.
                    </p>
                  </div>
                )}

                {result.status === 'rejected' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 mt-4">
                    <p className="text-sm text-red-800">
                      <strong>Your registration has been rejected.</strong> Please contact the reception desk for more information.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Status Timeline</h3>
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, index) => {
                  const currentStep = getCurrentStepIndex(result.status)
                  const isCompleted = index <= currentStep
                  const isCurrent = index === currentStep
                  const Icon = step.icon

                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-[#0B3D91] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {index < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-0.5 h-12 ${isCompleted ? 'bg-[#0B3D91]' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className={`text-sm font-medium ${isCompleted ? 'text-[#0B3D91]' : 'text-gray-500'}`}>{step.label}</p>
                        {isCurrent && <p className="text-xs text-gray-500 mt-0.5">Current stage</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact reception at <a href="mailto:reception@afcsc.edu.ng" className="text-[#0B3D91] hover:underline">reception@afcsc.edu.ng</a> or call +234 803 000 0000
          </p>
        </div>
      </div>
    </div>
  )
}