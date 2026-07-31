'use client'

import { motion } from 'framer-motion'
import { Users, Clock, CheckCircle, XCircle, AlertTriangle, UserCheck, LogOut } from 'lucide-react'
import { fadeIn, hoverScale } from '@/lib/animations/variants'

interface RecentVisitor {
  id: string
  full_name: string
  status: string
  created_at: string
  purpose?: string
  host_name?: string
}

interface RecentVisitorsProps {
  visitors: RecentVisitor[]
}

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  approved: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle },
  checked_in: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: UserCheck },
  checked_out: { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: LogOut },
  rejected: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  expired: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
}

export default function RecentVisitors({ visitors }: RecentVisitorsProps) {
  if (visitors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            Recent Visitors
          </h3>
        </div>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-300" />
          </div>
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
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          Recent Visitors
        </h3>
        <p className="text-sm text-gray-500 mt-1 ml-10">Latest visitor activity</p>
      </div>
      <div className="divide-y divide-gray-50">
        {visitors.slice(0, 8).map((visitor, index) => {
          const config = statusConfig[visitor.status] || statusConfig.pending
          const StatusIcon = config.icon
          return (
            <motion.div
              key={visitor.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ backgroundColor: 'rgba(249,250,251,0.8)' }}
              className="flex items-center gap-4 p-4 transition-colors cursor-default"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-gray-600">{visitor.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{visitor.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{visitor.purpose || 'No purpose specified'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.border} ${config.bg} ${config.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {visitor.status.replace(/_/g, ' ')}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
