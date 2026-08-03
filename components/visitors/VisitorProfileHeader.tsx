'use client'

import { motion } from 'framer-motion'
import { UserCheck, QrCode, Printer, Download, Eye, BadgeCheck } from 'lucide-react'
import type { Visitor, Visit } from '@/lib/types/visitor'
import type { VisitorBadge } from '@/lib/types/badge'

interface VisitorProfileHeaderProps {
  visitor: Visitor
  visits: Visit[]
  badges: VisitorBadge[]
  onPrintBadge: (visitId: string) => void
  onDownloadBadge: (visitId: string) => void
  onExportPDF: () => void
  onOpenQRModal: () => void
  loading?: boolean
}

export default function VisitorProfileHeader({
  visitor,
  visits,
  badges,
  onPrintBadge,
  onDownloadBadge,
  onExportPDF,
  onOpenQRModal,
  loading,
}: VisitorProfileHeaderProps) {
  const activeVisit = visits.find(v => v.status === 'checked_in' || v.status === 'approved')
  const activeBadge = badges.find(b => b.badge_status === 'Active')
  const registrationNumber = visitor.id.slice(0, 8).toUpperCase()

  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-5">
          {visitor.photo_url ? (
            <img
              src={visitor.photo_url}
              alt={visitor.full_name}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/10"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{(visitor.full_name || '?').charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{visitor.full_name || 'Unknown Visitor'}</h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">Reg: {registrationNumber}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                activeVisit?.status === 'checked_in'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : activeVisit?.status === 'approved'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                <UserCheck className="h-3 w-3" />
                {activeVisit?.status?.replace('_', ' ') || 'No Active Visit'}
              </span>
              {activeBadge && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <BadgeCheck className="h-3 w-3" />
                  {activeBadge.badge_number}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenQRModal}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </motion.button>
          {activeVisit && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPrintBadge(activeVisit.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Printer className="h-4 w-4" />
                Print Badge
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDownloadBadge(activeVisit.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Download className="h-4 w-4" />
                Download
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onExportPDF}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Eye className="h-4 w-4" />
                Export PDF
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
