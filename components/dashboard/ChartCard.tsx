'use client'

import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { fadeUp, hoverScale } from '@/lib/animations/variants'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  onExport?: () => void
  exporting?: boolean
  index?: number
}

export default function ChartCard({ title, subtitle, children, onExport, exporting, index = 0 }: ChartCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {onExport && (
          <motion.button
            {...hoverScale}
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm"
          >
            {exporting ? (
              <div className="h-3.5 w-3.5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export
          </motion.button>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  )
}
