'use client'

import { QRCodeSVG } from 'qrcode.react'
import { FileText, Download } from 'lucide-react'

interface VisitorBadgeProps {
  badge: {
    id: string
    badge_number: string
    badge_status: string
    issued_at: string
    expires_at: string
    printed_at: string | null
    printed_by: string | null
    reprint_count: number
  visit: {
    id: string
    visitor: {
      full_name: string
      visitor_organization: string
      photo_url: string | null
    } | null
    employee: {
      full_name: string
      department: string
    } | null
    purpose: string
    check_in_time: string | null
    check_out_time: string | null
  } | null
  }
  onClose: () => void
  showActions?: boolean
  onPrint?: () => void
  onDownload?: () => void
  onReprint?: () => void
}

const statusColors: Record<string, string> = {
  Active: 'bg-green-500',
  Expired: 'bg-red-500',
  'Checked Out': 'bg-gray-500',
  Cancelled: 'bg-red-700',
}

export default function VisitorBadge({
  badge,
  onClose,
  showActions = true,
  onPrint,
  onDownload,
  onReprint,
}: VisitorBadgeProps) {
  const qrValue = JSON.stringify({
    visitId: badge.visit?.id,
    qrToken: badge.badge_number,
    type: 'visitor-pass',
    issuedAt: badge.issued_at,
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePrint = () => {
    window.print()
    onPrint?.()
  }

  const handleDownload = () => {
    onDownload?.()
  }

  const handleReprint = () => {
    onReprint?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Visitor Badge</h2>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div
            id="visitor-badge-print-area"
            className="relative rounded-xl border-2 border-gray-300 bg-white p-6 print:shadow-none"
            style={{ aspectRatio: '1.6 / 1' }}
          >
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white font-bold text-lg tracking-wider">VISITOR</span>
            </div>

            <div className="absolute top-10 right-0 w-24 h-24 flex items-center justify-center">
              <div className={`px-2 py-1 rounded-b-lg text-white text-xs font-bold ${statusColors[badge.badge_status] || 'bg-gray-500'}`}>
                {badge.badge_status}
              </div>
            </div>

            <div className="pt-12 pb-4 flex gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-4">
                  {badge.visit?.visitor?.photo_url ? (
                    <img
                      src={badge.visit.visitor.photo_url}
                      alt={badge.visit.visitor.full_name || ''}
                      className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-200">
                      <span className="text-2xl text-gray-500">
                        {(badge.visit?.visitor?.full_name || 'V').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {badge.visit?.visitor?.full_name || '—'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {badge.visit?.visitor?.visitor_organization || '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex">
                    <span className="text-gray-500 w-32">Host:</span>
                    <span className="text-gray-900 font-medium">{badge.visit?.employee?.full_name || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-32">Department:</span>
                    <span className="text-gray-900">{badge.visit?.employee?.department || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-32">Purpose:</span>
                    <span className="text-gray-900">{badge.visit?.purpose || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-32">Badge #:</span>
                    <span className="text-gray-900 font-mono font-bold">{badge.badge_number}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <QRCodeSVG value={qrValue} size={120} />
                <p className="text-xs text-gray-500 text-center">
                  Scan for check-in/out
                  <br />
                  and verification
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-600">
              <div>
                <span className="text-gray-500">Issued:</span>{' '}
                <span className="font-medium">{formatDate(badge.issued_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">Expires:</span>{' '}
                <span className="font-medium">{formatDate(badge.expires_at)}</span>
              </div>
            </div>
          </div>

              {showActions && (
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
