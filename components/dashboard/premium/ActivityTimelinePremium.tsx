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
  registration: { color: 'text-[#C8A646]', bg: 'bg-[#C8A646]/10', icon: UserPlus },
  approval: { color: 'text-[#6B8E23]', bg: 'bg-[#6B8E23]/10', icon: CheckCircle },
  checkin: { color: 'text-[#6B8E23]', bg: 'bg-[#6B8E23]/10', icon: UserPlus },
  checkout: { color: 'text-[#9A9F87]', bg: 'bg-[#9A9F87]/10', icon: LogOut },
  badge: { color: 'text-[#C8A646]', bg: 'bg-[#C8A646]/10', icon: Printer },
  security: { color: 'text-[#f87171]', bg: 'bg-[#8B3A3A]/10', icon: ShieldAlert },
  other: { color: 'text-[#9A9F87]', bg: 'bg-[#9A9F87]/10', icon: Clock },
}

export default function ActivityTimelinePremium({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#F5F5DC]">Today&apos;s Activity</h2>
          <span className="text-xs text-[#9A9F87] font-medium bg-[#4B5320]/10 px-2.5 py-1 rounded-full">0</span>
        </div>
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-3 text-[#9A9F87]" />
          <p className="text-sm text-[#F5F5DC]">No activity yet today</p>
          <p className="text-xs text-[#9A9F87] mt-1">Events will appear here as they occur</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-[rgba(85,107,47,0.25)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5DC]">Today&apos;s Activity</h2>
          <p className="text-sm text-[#9A9F87] mt-0.5">Chronological timeline of events</p>
        </div>
        <motion.span
          layout
          className="text-xs font-medium text-[#9A9F87] bg-[#4B5320]/10 px-2.5 py-1 rounded-full"
        >
          {events.length} events
        </motion.span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="relative">
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-[#C8A646]/30 via-[rgba(85,107,47,0.35)] to-transparent" />
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
