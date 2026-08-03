'use client'

import { motion } from 'framer-motion'
import { Printer, RefreshCw, Shield, ShieldCheck, Ban, BarChart3, Download, Eye } from 'lucide-react'

interface VisitorActionsPanelProps {
  visitorId: string
  onViewBadge: (visitId: string) => void
  onPrintBadge: (visitId: string) => void
  onReprintBadge: (visitId: string) => void
  onSuspendVisitor: () => void
  onReinstateVisitor: () => void
  onBlacklistVisitor: () => void
  onViewReports: () => void
  onDownloadHistory: () => void
}

export default function VisitorActionsPanel({
  visitorId,
  onViewBadge,
  onPrintBadge,
  onReprintBadge,
  onSuspendVisitor,
  onReinstateVisitor,
  onBlacklistVisitor,
  onViewReports,
  onDownloadHistory,
}: VisitorActionsPanelProps) {
  const actions = [
    { label: 'View Badge', icon: Eye, onClick: () => onViewBadge(visitorId), variant: 'secondary' as const },
    { label: 'Print Badge', icon: Printer, onClick: () => onPrintBadge(visitorId), variant: 'secondary' as const },
    { label: 'Reprint Badge', icon: RefreshCw, onClick: () => onReprintBadge(visitorId), variant: 'secondary' as const },
    { label: 'Suspend Visitor', icon: Shield, onClick: onSuspendVisitor, variant: 'warning' as const },
    { label: 'Reinstate Visitor', icon: ShieldCheck, onClick: onReinstateVisitor, variant: 'success' as const },
    { label: 'Blacklist', icon: Ban, onClick: onBlacklistVisitor, variant: 'danger' as const },
    { label: 'View Reports', icon: BarChart3, onClick: onViewReports, variant: 'secondary' as const },
    { label: 'Download History', icon: Download, onClick: onDownloadHistory, variant: 'secondary' as const },
  ]

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'danger':
        return 'border-red-200 text-red-700 hover:bg-red-50 focus:ring-red-500/50'
      case 'warning':
        return 'border-amber-200 text-amber-700 hover:bg-amber-50 focus:ring-amber-500/50'
      case 'success':
        return 'border-green-200 text-green-700 hover:bg-green-50 focus:ring-green-500/50'
      default:
        return 'border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-primary/50'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.onClick}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${getVariantStyles(action.variant)}`}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
