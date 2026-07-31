'use client'

import { motion } from 'framer-motion'
import { Clock, UserPlus, CheckCircle, LogOut, Printer, ShieldCheck, AlertTriangle } from 'lucide-react'
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
  security: { color: 'text-red-600', bg: 'bg-red-100', icon: ShieldCheck },
  other: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
}

export default function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
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
            Today&apos;s Activity
          </h3>
        </div>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-gray-300" />
          </div>
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
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
          Today&apos;s Activity
        </h3>
        <p className="text-sm text-gray-500 mt-1 ml-10">Chronological timeline of events</p>
      </div>
      <div className="p-5">
        <div className="relative">
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-gray-200 to-transparent" />
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
                  <div className={`relative z-10 p-2 rounded-xl ${config.bg} ${config.color} shadow-sm`}>
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
