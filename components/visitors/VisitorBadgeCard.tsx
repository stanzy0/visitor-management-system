'use client'

import { motion } from 'framer-motion'
import { BadgeCheck, Printer, QrCode, Calendar, RefreshCw } from 'lucide-react'
import type { VisitorBadge } from '@/lib/types/badge'
import { format } from 'date-fns'

interface VisitorBadgeCardProps {
  badges: VisitorBadge[]
  onPrint: (badge: VisitorBadge) => void
  onReprint: (badge: VisitorBadge) => void
  loading?: boolean
}

export default function VisitorBadgeCard({ badges, onPrint, onReprint, loading }: VisitorBadgeCardProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const activeBadge = badges.find(b => b.badge_status === 'Active') || badges[0]

  if (!activeBadge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Badge Information</h2>
        <div className="text-center py-8">
          <BadgeCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No badge issued yet</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Badge Information</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
          activeBadge.badge_status === 'Active'
            ? 'bg-green-50 text-green-700 border-green-200'
            : activeBadge.badge_status === 'Expired'
              ? 'bg-red-50 text-red-700 border-red-200'
              : activeBadge.badge_status === 'Checked Out'
                ? 'bg-gray-50 text-gray-700 border-gray-200'
                : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <BadgeCheck className="h-3 w-3" />
          {activeBadge.badge_status}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
          <div className="p-2 rounded-lg bg-white">
            <QrCode className="h-8 w-8 text-gray-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Badge Number</p>
            <p className="text-sm font-mono font-bold text-gray-900">{activeBadge.badge_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Issued</p>
              <p className="text-sm text-gray-900">{format(new Date(activeBadge.issued_at), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Expires</p>
              <p className="text-sm text-gray-900">{format(new Date(activeBadge.expires_at), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Reprint Count</p>
            <p className="text-sm text-gray-900">{activeBadge.reprint_count}</p>
          </div>
        </div>

        {activeBadge.printed_at && (
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Last Printed</p>
              <p className="text-sm text-gray-900">{activeBadge.printed_at ? format(new Date(activeBadge.printed_at), 'MMM dd, yyyy') : '—'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPrint(activeBadge)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Printer className="h-4 w-4" />
            Print
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onReprint(activeBadge)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <RefreshCw className="h-4 w-4" />
            Reprint
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
