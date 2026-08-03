'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: React.ReactNode
  loading?: boolean
  actions?: React.ReactNode
}

export default function ChartCard({ title, subtitle, icon: Icon, children, loading, actions }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-gray-400" />}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[250px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </motion.div>
  )
}
