'use client'

import { SecurityAlert } from '@/hooks/useDashboardData'
import { AlertTriangle, ShieldAlert, Clock, XCircle, ShieldCheck } from 'lucide-react'

const severityConfig: Record<string, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: ShieldAlert },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: ShieldCheck },
}

interface SecurityPanelProps {
  alerts: SecurityAlert[]
  onViewDetails?: (alert: SecurityAlert) => void
}

export default function SecurityPanel({ alerts, onViewDetails }: SecurityPanelProps) {
  const critical = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Security Status: Normal</h3>
            <p className="text-sm text-green-700">No critical security anomalies detected</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          Security Overview
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {critical.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Critical</p>
            {critical.map((alert) => {
              const config = severityConfig[alert.severity]
              const Icon = config.icon
              return (
                <button
                  key={alert.type}
                  onClick={() => onViewDetails?.(alert)}
                  className={`w-full rounded-lg border ${config.border} ${config.bg} p-3 flex items-center justify-between hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${config.text}`}>{alert.label}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${config.text}`}>{alert.count}</span>
                </button>
              )
            })}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Warnings</p>
            {warnings.map((alert) => {
              const config = severityConfig[alert.severity]
              const Icon = config.icon
              return (
                <button
                  key={alert.type}
                  onClick={() => onViewDetails?.(alert)}
                  className={`w-full rounded-lg border ${config.border} ${config.bg} p-3 flex items-center justify-between hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${config.text}`}>{alert.label}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${config.text}`}>{alert.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
