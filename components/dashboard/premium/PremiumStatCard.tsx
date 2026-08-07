'use client'

import { motion } from 'framer-motion'
import { KeyboardEvent } from 'react'
import { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { fadeUp } from '@/lib/animations/variants'

export type CardColor = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'indigo' | 'amber' | 'emerald' | 'purple' | 'teal'

const colorMap: Record<CardColor, { bg: string; text: string; iconBg: string; trendColor: string; trendBg: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100 text-green-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100 text-orange-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100 text-red-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', iconBg: 'bg-gray-100 text-gray-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'bg-indigo-100 text-indigo-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-100 text-teal-600', trendColor: 'text-green-700', trendBg: 'bg-green-100' },
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  color?: CardColor
  trend?: number
  subtitle?: string
  onClick?: () => void
  index?: number
  loading?: boolean
}

export default function PremiumStatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'blue',
  trend,
  subtitle,
  onClick,
  index = 0,
  loading = false,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.blue
  const numericValue = typeof value === 'number' ? value : parseInt(value as string, 10) || 0
  const animatedValue = useCountUp(numericValue, 1200)
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0
  const trendColor = trendUp ? 'text-green-700 bg-green-100' : trendDown ? 'text-red-700 bg-red-100' : 'text-gray-500 bg-gray-100'

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? { y: -2, scale: 1.01 } : { y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
       className="group relative overflow-hidden rounded-[20px] border border-gray-200/60 bg-white p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_12px_35px_rgba(0,0,0,0.10)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mt-1">
              {typeof value === 'number' ? animatedValue.toLocaleString() : value}
            </p>
          )}
          {(description || subtitle) && (
            <p className="text-sm text-gray-500 mt-1">
              {description || subtitle}
            </p>
          )}
        </div>

        <div className={`p-2 sm:p-3 rounded-xl ${c.iconBg} flex-shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="relative mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendColor}`}
            title={trend > 0 ? `${trend}% increase` : trend < 0 ? `${Math.abs(trend)}% decrease` : 'No change'}
          >
            {trend > 0 ? '▲' : trend < 0 ? '▼' : '●'}
            <span>{Math.abs(trend)}%</span>
          </span>
          <span className="text-xs text-gray-400 font-mono">
            vs. yesterday
          </span>
        </div>
      )}
    </motion.div>
  )
}
