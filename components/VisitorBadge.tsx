'use client'

import { FileText, Download } from 'lucide-react'
import BadgeLayout from './BadgeLayout'
import type { VisitorBadge } from '@/lib/badge/badge-types'

interface VisitorBadgeProps {
  badge: VisitorBadge
  onClose?: () => void
  showActions?: boolean
  onPrint?: () => void
  onDownload?: () => void
  onReprint?: () => void
}

export default function VisitorBadge({
  badge,
  onClose,
  showActions = true,
  onPrint,
  onDownload,
  onReprint,
}: VisitorBadgeProps) {
  const handlePrint = () => {
    window.print()
    onPrint?.()
  }

  const handleDownload = () => {
    onDownload?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Visitor Badge</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            )}
          </div>

          <BadgeLayout badge={badge} />

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
