'use client'

import { motion } from 'framer-motion'
import {
  Printer,
  Scan,
  Camera,
  Database,
  Mail,
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

type StatusLevel = 'operational' | 'warning' | 'offline'

interface SystemService {
  id: string
  name: string
  description: string
  status: StatusLevel
  icon: React.ComponentType<{ className?: string }>
}

const defaultServices: SystemService[] = [
  { id: 'badge-printer', name: 'Badge Printer', description: 'Physical badge printer', status: 'operational', icon: Printer },
  { id: 'qr-scanner', name: 'QR Scanner', description: 'Visitor QR scanning device', status: 'operational', icon: Scan },
  { id: 'camera', name: 'Camera Feed', description: 'Entry/exit camera', status: 'operational', icon: Camera },
  { id: 'supabase', name: 'Supabase', description: 'Database & auth backend', status: 'operational', icon: Database },
  { id: 'email', name: 'Email Service', description: 'Visitor notifications', status: 'operational', icon: Mail },
  { id: 'sms', name: 'SMS Gateway', description: 'Text message delivery', status: 'warning', icon: MessageSquare },
  { id: 'realtime', name: 'Realtime', description: 'Live data sync', status: 'operational', icon: Radio },
]

const statusConfig: Record<StatusLevel, { color: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  operational: { color: 'text-green-600', bg: 'bg-green-100', text: 'Operational', icon: CheckCircle2 },
  warning: { color: 'text-orange-600', bg: 'bg-orange-100', text: 'Warning', icon: AlertTriangle },
  offline: { color: 'text-red-600', bg: 'bg-red-100', text: 'Offline', icon: XCircle },
}

interface SystemStatusProps {
  services?: SystemService[]
}

export default function SystemStatus({ services = defaultServices }: SystemStatusProps) {
  const operationalCount = services.filter(s => s.status === 'operational').length
  const warningCount = services.filter(s => s.status === 'warning').length
  const offlineCount = services.filter(s => s.status === 'offline').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time service health monitoring</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600">{operationalCount} Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-gray-600">{warningCount} Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-gray-600">{offlineCount} Offline</span>
          </div>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {services.map((service) => {
          const config = statusConfig[service.status]
          const Icon = service.icon
          const StatusIcon = config.icon

          return (
            <motion.div
              key={service.id}
              variants={fadeIn}
              className="flex items-center gap-4 rounded-xl border border-gray-200/60 bg-gray-50/50 p-4 transition-all duration-200 hover:bg-white hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            >
              <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                <p className="text-xs text-gray-500 truncate">{service.description}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>{config.text}</span>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
