'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ReportKPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'emerald' | 'orange' | 'gray'
  trend?: { value: string; label: string; direction: 'up' | 'down' | 'neutral' }
  loading?: boolean
  index?: number
}

export default function ReportKPICard({ title, value, subtitle, icon: Icon, color, trend, loading, index = 0 }: ReportKPICardProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const colorMap: Record<string, { bg: string; text: string; iconBg: string; iconText: string; trendBg: string; trendText: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600', trendBg: 'bg-blue-50', trendText: 'text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100', iconText: 'text-green-600', trendBg: 'bg-green-50', trendText: 'text-green-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600', trendBg: 'bg-amber-50', trendText: 'text-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100', iconText: 'text-red-600', trendBg: 'bg-red-50', trendText: 'text-red-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100', iconText: 'text-purple-600', trendBg: 'bg-purple-50', trendText: 'text-purple-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', trendBg: 'bg-emerald-50', trendText: 'text-emerald-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600', trendBg: 'bg-orange-50', trendText: 'text-orange-700' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', iconBg: 'bg-gray-100', iconText: 'text-gray-600', trendBg: 'bg-gray-50', trendText: 'text-gray-700' },
  }

  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`text-3xl font-bold ${colors.text} mb-1`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trend.direction === 'up' ? 'bg-green-50 text-green-700' : trend.direction === 'down' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          </span>
          <span className="text-xs text-gray-500">{trend.label}</span>
        </div>
      )}
    </motion.div>
  )
}
