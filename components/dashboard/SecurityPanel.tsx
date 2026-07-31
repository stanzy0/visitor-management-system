'use client'

import { motion } from 'framer-motion'
import { SecurityAlert } from '@/hooks/useDashboardData'
import { AlertTriangle, ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react'
import { fadeIn, hoverScale } from '@/lib/animations/variants'

const severityConfig: Record<string, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }>; glow: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200/60', text: 'text-red-700', icon: AlertTriangle, glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-700', icon: ShieldAlert, glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', icon: ShieldCheck, glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
}

interface SecurityPanelProps {
  alerts: SecurityAlert[]
  onViewDetails?: (alert: SecurityAlert) => void
}

export default function SecurityPanel({ alerts, onViewDetails }: SecurityPanelProps) {
  const critical = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')
  const info = alerts.filter(a => a.severity === 'info')

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 shadow-sm p-5"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 text-green-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Security Status: Normal</h3>
            <p className="text-sm text-green-700 mt-0.5">No critical security anomalies detected</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="ml-auto"
          >
            <div className="h-3 w-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-100 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          Security Overview
        </h3>
        <p className="text-xs text-gray-500 mt-1 ml-10">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-4 space-y-3">
        {critical.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-1">Critical</p>
            {critical.map((alert) => {
              const config = severityConfig[alert.severity]
              const Icon = config.icon
              return (
                <motion.button
                  key={alert.type}
                  variants={hoverScale}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => onViewDetails?.(alert)}
                  className={`w-full rounded-xl border ${config.border} ${config.bg} p-4 flex items-center justify-between transition-all ${config.glow}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${config.text}`}>{alert.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${config.text}`}>{alert.count}</span>
                    <ArrowRight className={`h-4 w-4 ${config.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-1">Warnings</p>
            {warnings.map((alert) => {
              const config = severityConfig[alert.severity]
              const Icon = config.icon
              return (
                <motion.button
                  key={alert.type}
                  variants={hoverScale}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => onViewDetails?.(alert)}
                  className={`w-full rounded-xl border ${config.border} ${config.bg} p-4 flex items-center justify-between transition-all ${config.glow}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${config.text}`}>{alert.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${config.text}`}>{alert.count}</span>
                    <ArrowRight className={`h-4 w-4 ${config.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
        {info.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-1">Information</p>
            {info.map((alert) => {
              const config = severityConfig[alert.severity]
              const Icon = config.icon
              return (
                <motion.button
                  key={alert.type}
                  variants={hoverScale}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => onViewDetails?.(alert)}
                  className={`w-full rounded-xl border ${config.border} ${config.bg} p-4 flex items-center justify-between transition-all ${config.glow}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${config.text}`}>{alert.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${config.text}`}>{alert.count}</span>
                    <ArrowRight className={`h-4 w-4 ${config.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
