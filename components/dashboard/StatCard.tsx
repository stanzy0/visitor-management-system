'use client'

import { motion } from 'framer-motion'
import { KeyboardEvent } from 'react'
import { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { fadeUp, hoverScale } from '@/lib/animations/variants'

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string; gradient: string; iconBg: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]', gradient: 'from-blue-500/5 to-transparent', iconBg: 'bg-blue-100 text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200/60', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', gradient: 'from-green-500/5 to-transparent', iconBg: 'bg-green-100 text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]', gradient: 'from-purple-500/5 to-transparent', iconBg: 'bg-purple-100 text-purple-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', gradient: 'from-amber-500/5 to-transparent', iconBg: 'bg-amber-100 text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200/60', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]', gradient: 'from-red-500/5 to-transparent', iconBg: 'bg-red-100 text-red-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', gradient: 'from-emerald-500/5 to-transparent', iconBg: 'bg-emerald-100 text-emerald-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/60', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]', gradient: 'from-orange-500/5 to-transparent', iconBg: 'bg-orange-100 text-orange-600' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200/60', glow: 'shadow-[0_0_15px_rgba(107,114,128,0.1)]', gradient: 'from-gray-500/5 to-transparent', iconBg: 'bg-gray-100 text-gray-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]', gradient: 'from-indigo-500/5 to-transparent', iconBg: 'bg-indigo-100 text-indigo-600' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/60', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]', gradient: 'from-teal-500/5 to-transparent', iconBg: 'bg-teal-100 text-teal-600' },
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: keyof typeof colorMap
  trend?: number
  subtitle?: string
  onClick?: () => void
  index?: number
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, subtitle, onClick, index = 0 }: StatCardProps) {
  const c = colorMap[color] || colorMap.blue
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10) || 0
  const animatedValue = useCountUp(numericValue, 1200)
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0
  const trendColor = trendUp ? 'text-green-700 bg-green-100' : trendDown ? 'text-red-700 bg-red-100' : 'text-gray-500 bg-gray-100'
  const trendIcon = trendUp ? '▲' : trendDown ? '▼' : '●'
  const trendLabel = trendUp ? `${trend}% increase` : trendDown ? `${Math.abs(trend)}% decrease` : 'No change'

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
      whileHover={onClick ? { y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)' } : { y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={`relative overflow-hidden rounded-2xl border ${c.border} bg-white p-5 shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2' : ''}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <motion.div className={`p-2.5 rounded-xl ${c.iconBg}`} whileHover={{ rotate: 15 }}>
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {typeof value === 'number' ? animatedValue.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        {trend !== undefined && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendColor}`}
            title={trendLabel}
          >
            {trendIcon}
            <span>{Math.abs(trend)}%</span>
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}
