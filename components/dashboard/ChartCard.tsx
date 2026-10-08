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
      className="rounded-2xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-[rgba(85,107,47,0.25)] flex items-center justify-between bg-gradient-to-r from-[#4B5320]/10 to-[#10150D]">
        <div>
          <h3 className="text-base font-semibold text-[#F5F5DC]">{title}</h3>
          {subtitle && <p className="text-xs text-[#9A9F87] mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {onExport && (
          <motion.button
            {...hoverScale}
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] px-3 py-1.5 text-xs font-medium text-[#F5F5DC] hover:bg-[#4B5320]/10 hover:border-[#C8A646]/40 disabled:opacity-50 transition-all shadow-sm"
          >
            {exporting ? (
              <div className="h-3.5 w-3.5 border-2 border-[#9A9F87] border-t-[#C8A646] rounded-full animate-spin" />
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
