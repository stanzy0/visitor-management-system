'use client'

import { motion } from 'framer-motion'
import { ActivityItem } from '@/hooks/useDashboardData'
import { Users, UserCheck, LogOut, Printer, ShieldCheck, ShieldAlert, UserPlus, Building2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  visitor_created: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  visit_approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  visitor_checked_in: { icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  visitor_checked_out: { icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-100' },
  badge_generated: { icon: Printer, color: 'text-purple-600', bg: 'bg-purple-100' },
  badge_printed: { icon: Printer, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  badge_cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  employee_created: { icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-100' },
  office_location_updated: { icon: Building2, color: 'text-amber-600', bg: 'bg-amber-100' },
}

const actionLabels: Record<string, string> = {
  visitor_created: 'Visitor Registered',
  visit_approved: 'Visit Approved',
  visitor_checked_in: 'Visitor Checked In',
  visitor_checked_out: 'Visitor Checked Out',
  badge_generated: 'Badge Generated',
  badge_printed: 'Badge Printed',
  badge_cancelled: 'Badge Cancelled',
  employee_created: 'Employee Added',
  office_location_updated: 'Office Location Updated',
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
}

export default function ActivityFeed({ activities, maxItems = 20 }: ActivityFeedProps) {
  const display = (activities || []).slice(0, maxItems)

  if (display.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            Live Activity Feed
          </h3>
          <p className="text-sm text-gray-500 mt-1 ml-10">Real-time events and updates</p>
        </div>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">No recent activity</p>
          <p className="text-xs text-gray-400 mt-1">Activity will appear here as events occur</p>
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
            <Clock className="h-5 w-5" />
          </div>
          Live Activity Feed
        </h3>
        <p className="text-sm text-gray-500 mt-1 ml-10">Real-time events and updates</p>
      </div>
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-100" />
        <div className="max-h-[500px] overflow-y-auto">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-gray-50">
            {display.map((item, index) => {
              const label = actionLabels[item.action] || (item.action || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              const config = iconMap[item.action] || { icon: ShieldAlert, color: 'text-gray-600', bg: 'bg-gray-100' }
              const Icon = config.icon
              return (
                <motion.div
                  key={item.id}
                  variants={fadeIn}
                  custom={index}
                  className="flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-colors relative"
                >
                  <div className={`relative z-10 p-2.5 rounded-xl ${config.bg} ${config.color} shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.details}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap font-mono pt-1">{formatTime(item.created_at)}</span>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
