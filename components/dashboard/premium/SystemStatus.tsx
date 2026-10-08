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
  operational: { color: 'text-[#6B8E23]', bg: 'bg-[#6B8E23]/10', text: 'Operational', icon: CheckCircle2 },
  warning: { color: 'text-[#C8A646]', bg: 'bg-[#C8A646]/10', text: 'Warning', icon: AlertTriangle },
  offline: { color: 'text-[#f87171]', bg: 'bg-[#8B3A3A]/10', text: 'Offline', icon: XCircle },
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
      className="rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5DC]">System Status</h2>
            <p className="text-sm text-[#9A9F87] mt-0.5">Real-time service health monitoring</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#6B8E23]" />
              <span className="text-[#9A9F87]">{operationalCount} Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#C8A646]" />
              <span className="text-[#9A9F87]">{warningCount} Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#f87171]" />
              <span className="text-[#9A9F87]">{offlineCount} Offline</span>
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
               className="flex items-center gap-4 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#4B5320]/5 p-4 transition-all duration-200 hover:bg-[#4B5320]/10 hover:border-[rgba(200,166,70,0.4)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
             >
               <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
                 <Icon className="h-5 w-5" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold text-[#F5F5DC]">{service.name}</p>
                 <p className="text-xs text-[#9A9F87] truncate">{service.description}</p>
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
