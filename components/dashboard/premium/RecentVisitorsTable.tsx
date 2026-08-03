'use client'

import { motion } from 'framer-motion'
import { Users, Clock, UserCheck, LogOut, CheckCircle, XCircle, AlertTriangle, ShieldAlert, Eye, Printer, BadgeCheck, BadgeMinus } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

interface RecentVisitor {
  id: string
  full_name: string
  photo_url?: string | null
  status: string
  created_at: string
  purpose?: string
  host_name?: string
  host_department?: string
}

interface RecentVisitorsTableProps {
  visitors: RecentVisitor[]
  onViewProfile?: (id: string) => void
  onPrintBadge?: (id: string) => void
}

const statusConfig: Record<string, { color: string; bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Pending', icon: Clock },
  approved: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Approved', icon: CheckCircle },
  checked_in: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', text: 'Checked In', icon: UserCheck },
  checked_out: { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', text: 'Checked Out', icon: LogOut },
  completed: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Completed', icon: CheckCircle },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'Cancelled', icon: XCircle },
  rejected: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'Rejected', icon: XCircle },
  expired: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'Expired', icon: AlertTriangle },
  overstayed: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', text: 'Overstayed', icon: AlertTriangle },
  documents_verified: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Documents Verified', icon: ShieldAlert },
  badge_issued: { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'Badge Issued', icon: Printer },
}

const badgeConfig: Record<string, { text: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  checked_in: { text: 'Active', color: 'text-green-600', icon: BadgeCheck },
  badge_issued: { text: 'Issued', color: 'text-blue-600', icon: BadgeCheck },
  checked_out: { text: 'Returned', color: 'text-gray-500', icon: BadgeMinus },
  completed: { text: 'Completed', color: 'text-emerald-600', icon: BadgeCheck },
  approved: { text: 'Pending Print', color: 'text-amber-600', icon: Printer },
  documents_verified: { text: 'Pending Print', color: 'text-amber-600', icon: Printer },
  pending: { text: 'Pending', color: 'text-amber-600', icon: Clock },
  rejected: { text: 'N/A', color: 'text-red-600', icon: XCircle },
  cancelled: { text: 'N/A', color: 'text-red-600', icon: XCircle },
  expired: { text: 'Expired', color: 'text-red-600', icon: AlertTriangle },
  overstayed: { text: 'Overstayed', color: 'text-orange-600', icon: AlertTriangle },
  default: { text: '—', color: 'text-gray-400', icon: Clock },
}

export default function RecentVisitorsTable({ visitors, onViewProfile, onPrintBadge }: RecentVisitorsTableProps) {
  if (visitors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Visitors</h2>
          <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">0</span>
        </div>
        <div className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No recent visitors</p>
          <p className="text-xs text-gray-400 mt-1">Visitor activity will appear here</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Visitors</h2>
          <p className="text-sm text-gray-500 mt-0.5">Latest visitor activity</p>
        </div>
        <motion.span
          layout
          className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
        >
          {visitors.length}
        </motion.span>
      </div>

      <div className="overflow-x-auto">
        <motion.table variants={staggerContainer} initial="hidden" animate="visible" className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Visitor</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Host</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Badge</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visitors.map((visitor, index) => {
              const config = statusConfig[visitor.status] || statusConfig.pending
              const StatusIcon = config.icon
              const badge = badgeConfig[visitor.status] || badgeConfig.default
              const BadgeIcon = badge.icon
              const initials = (visitor.full_name || '')
                .split(' ')
                .map(n => (n || '?').charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <motion.tr
                  key={visitor.id}
                  variants={fadeIn}
                  custom={index}
                  className="hover:bg-gray-50/80 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {visitor.photo_url ? (
                        <img
                          src={visitor.photo_url}
                          alt={visitor.full_name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{initials}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{visitor.full_name}</p>
                        {visitor.purpose && (
                          <p className="text-xs text-gray-500">{visitor.purpose}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-700">{visitor.host_name || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-600">{visitor.host_department || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                       {new Date(visitor.created_at || new Date().toISOString()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.border} ${config.bg} ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.text}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <BadgeIcon className={`h-4 w-4 ${badge.color}`} />
                      <span className={`text-xs font-medium ${badge.color}`}>{badge.text}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {onPrintBadge && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onPrintBadge(visitor.id)}
                          aria-label={`Print badge for ${visitor.full_name}`}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <Printer className="h-4 w-4" />
                        </motion.button>
                      )}
                      {onViewProfile && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onViewProfile(visitor.id)}
                          aria-label={`View profile of ${visitor.full_name}`}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </motion.table>
      </div>
    </motion.div>
  )
}
