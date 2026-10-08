'use client'

import { motion } from 'framer-motion'
import { KeyboardEvent } from 'react'
import { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { fadeUp } from '@/lib/animations/variants'

export type CardColor = 'army' | 'olive' | 'gold' | 'olive-light' | 'red' | 'gray' | 'gold-light' | 'olive-dark' | 'muted' | 'olive-mid'

const colorMap: Record<CardColor, { bg: string; text: string; iconBg: string; trendColor: string; trendBg: string }> = {
  army: { bg: 'bg-[#4B5320]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#4B5320]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  olive: { bg: 'bg-[#556B2F]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#556B2F]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  gold: { bg: 'bg-[#C8A646]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#C8A646]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  'olive-light': { bg: 'bg-[#6B8E23]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#6B8E23]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  red: { bg: 'bg-[#8B3A3A]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#8B3A3A]/20 text-[#f87171]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  gray: { bg: 'bg-[#9A9F87]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#9A9F87]/20 text-[#9A9F87]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  'gold-light': { bg: 'bg-[#B89635]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#B89635]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  'olive-dark': { bg: 'bg-[#3D5A1E]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#3D5A1E]/20 text-[#6B8E23]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  muted: { bg: 'bg-[#6B705A]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#6B705A]/20 text-[#9A9F87]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
  'olive-mid': { bg: 'bg-[#556B2F]/10', text: 'text-[#F5F5DC]', iconBg: 'bg-[#556B2F]/20 text-[#C8A646]', trendColor: 'text-[#6B8E23]', trendBg: 'bg-[#6B8E23]/20' },
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
  color = 'army',
  trend,
  subtitle,
  onClick,
  index = 0,
  loading = false,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.army
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
       className="group relative overflow-hidden rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:shadow-[0_12px_35px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50 focus:ring-offset-2"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#4B5320]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

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
