'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { AppointmentStats } from '@/lib/types/appointment'

interface AppointmentKPICardsProps {
  stats: AppointmentStats | null
  loading?: boolean
}

export default function AppointmentKPICards({ stats, loading }: AppointmentKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[20px] border border-gray-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    { label: "Today's Appointments", value: stats?.todayTotal ?? 0, icon: Calendar, color: 'blue' },
    { label: 'Upcoming', value: stats?.upcomingToday ?? 0, icon: Clock, color: 'amber' },
    { label: 'Awaiting Approval', value: stats?.arrived ?? 0, icon: AlertTriangle, color: 'orange' },
    { label: 'Approved', value: stats?.checkedIn ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'Completed', value: stats?.completedToday ?? 0, icon: CheckCircle2, color: 'emerald' },
    { label: 'No Shows', value: stats?.noShows ?? 0, icon: XCircle, color: 'red' },
  ]

  const colorMap: Record<string, { bg: string; text: string; iconBg: string; iconText: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100', iconText: 'text-green-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      {cards.map((card, index) => {
        const colors = colorMap[card.color]
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-[20px] border border-gray-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`text-3xl font-bold ${colors.text}`}>{card.value}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
