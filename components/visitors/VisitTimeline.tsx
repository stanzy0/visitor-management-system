'use client'

import { motion } from 'framer-motion'
import { UserPlus, CheckCircle, Printer, UserCheck, LogOut, FileText, XCircle, ShieldCheck } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

interface TimelineEvent {
  id: string
  action: string
  details: string
  performed_by: string
  created_at: string
}

interface VisitTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
}

const typeConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  visitor_created: { color: 'text-blue-600', bg: 'bg-blue-100', icon: UserPlus },
  visit_approved: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  visitor_checked_in: { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: UserCheck },
  visitor_checked_out: { color: 'text-gray-600', bg: 'bg-gray-100', icon: LogOut },
  badge_generated: { color: 'text-purple-600', bg: 'bg-purple-100', icon: Printer },
  badge_printed: { color: 'text-indigo-600', bg: 'bg-indigo-100', icon: Printer },
  badge_cancelled: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  document_uploaded: { color: 'text-teal-600', bg: 'bg-teal-100', icon: FileText },
  visitor_rejected: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  security_alert: { color: 'text-red-600', bg: 'bg-red-100', icon: ShieldCheck },
  default: { color: 'text-gray-600', bg: 'bg-gray-100', icon: ShieldCheck },
}

export default function VisitTimeline({ events, loading }: VisitTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit Timeline</h2>
        <div className="text-center py-8">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No timeline events yet</p>
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
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Visit Timeline</h2>
      <div className="relative">
        <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent" />
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
          {events.map((event, index) => {
            const config = typeConfig[event.action] || typeConfig.default
            const Icon = config.icon
            return (
              <motion.div
                key={event.id}
                variants={fadeIn}
                custom={index}
                className="flex items-start gap-4 relative"
              >
                <div className={`relative z-10 p-2 rounded-xl ${config.bg} ${config.color} shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{event.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <span className="text-xs text-gray-400 font-mono">{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{event.details}</p>
                  <p className="text-xs text-gray-400 mt-1">By {event.performed_by || 'System'}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}
