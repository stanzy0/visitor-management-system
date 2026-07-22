'use client'

import { LucideIcon } from 'lucide-react'

const colorMap: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', shadow: 'shadow-blue-500/10' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', shadow: 'shadow-green-500/10' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', shadow: 'shadow-purple-500/10' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', shadow: 'shadow-amber-500/10' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', shadow: 'shadow-red-500/10' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', shadow: 'shadow-emerald-500/10' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', shadow: 'shadow-orange-500/10' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', shadow: 'shadow-gray-500/10' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', shadow: 'shadow-indigo-500/10' },
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: keyof typeof colorMap
  trend?: number
  subtitle?: string
  onClick?: () => void
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, subtitle, onClick }: StatCardProps) {
  const c = colorMap[color] || colorMap.blue
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0
  const trendColor = trendUp ? 'text-green-600 bg-green-50' : trendDown ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
  const trendIcon = trendUp ? '▲' : trendDown ? '▼' : '●'

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border ${c.border} bg-white p-4 shadow-sm transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.text}`} />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}>
            {trendIcon}
          </span>
        )}
      </div>
    </div>
  )
}
