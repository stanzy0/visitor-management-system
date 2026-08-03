'use client'

import { motion } from 'framer-motion'
import { Clock, QrCode, Printer, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { Visit } from '@/lib/types/visitor'

interface PreviousVisitsProps {
  visits: Visit[]
  onViewBadge: (visitId: string) => void
  onPrintBadge: (visitId: string) => void
  loading?: boolean
}

export default function PreviousVisits({ visits, onViewBadge, onPrintBadge, loading }: PreviousVisitsProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Previous Visits</h2>
        <p className="text-sm text-gray-500 mt-0.5">{visits.length} visit{visits.length !== 1 ? 's' : ''} on record</p>
      </div>
      <div className="overflow-x-auto">
        {visits.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Host</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Badge</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visits.map((visit, index) => {
                const checkIn = visit.check_in_time ? new Date(visit.check_in_time) : null
                const checkOut = visit.check_out_time ? new Date(visit.check_out_time) : null
                const duration = checkIn && checkOut
                  ? `${Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60))} min`
                  : checkIn
                    ? 'In Progress'
                    : '—'

                const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
                  pending: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
                  approved: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle },
                  checked_in: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
                  checked_out: { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: CheckCircle },
                  rejected: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
                  expired: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
                }
                const config = statusConfig[visit.status] || statusConfig.pending
                const StatusIcon = config.icon

                return (
                  <motion.tr
                    key={visit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{visit.employee?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{visit.employee?.department || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{duration}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.border} ${config.bg} ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {visit.qr_code ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <QrCode className="h-3 w-3" />
                          Available
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onViewBadge(visit.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label="View badge"
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onPrintBadge(visit.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label="Print badge"
                        >
                          <Printer className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No visit history found</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
