'use client'

import { motion } from 'framer-motion'
import { Clock, UserPlus, CheckCircle, LogOut, Printer, ShieldAlert } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

interface TimelineEvent {
  id: string
  time: string
  title: string
  description: string
  type: 'registration' | 'approval' | 'checkin' | 'checkout' | 'badge' | 'security' | 'other'
}

interface ActivityTimelineProps {
  events: TimelineEvent[]
}

const typeConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  registration: { color: 'text-blue-600', bg: 'bg-blue-100', icon: UserPlus },
  approval: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  checkin: { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: UserPlus },
  checkout: { color: 'text-gray-600', bg: 'bg-gray-100', icon: LogOut },
  badge: { color: 'text-purple-600', bg: 'bg-purple-100', icon: Printer },
  security: { color: 'text-red-600', bg: 'bg-red-100', icon: ShieldAlert },
  other: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
}

export default function ActivityTimelinePremium({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Activity</h2>
          <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">0</span>
        </div>
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No activity yet today</p>
          <p className="text-xs text-gray-400 mt-1">Events will appear here as they occur</p>
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
      <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Activity</h2>
          <p className="text-sm text-gray-500 mt-0.5">Chronological timeline of events</p>
        </div>
        <motion.span
          layout
          className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
        >
          {events.length} events
        </motion.span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="relative">
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-gray-200 to-transparent" />
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            {events.slice(0, 10).map((event, index) => {
              const config = typeConfig[event.type] || typeConfig.other
              const Icon = config.icon
              return (
                <motion.div
                  key={event.id}
                  variants={fadeIn}
                  custom={index}
                  className="flex items-start gap-4 relative"
                >
                  <div className={`relative z-10 p-2.5 rounded-xl ${config.bg} ${config.color} shadow-sm border border-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <span className="text-xs text-gray-400 font-mono">{event.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
