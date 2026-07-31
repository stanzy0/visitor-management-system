'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Users, UserCheck, LogOut, UserPlus, FileText, BarChart3, Scan, QrCode, Printer } from 'lucide-react'
import { staggerContainer, fadeUp, hoverScale } from '@/lib/animations/variants'

const actions = [
  { label: 'Register Visitor', icon: UserPlus, href: '/visitors/new', color: 'blue' },
  { label: 'Check In', icon: UserCheck, href: '/visits?status=checked_in', color: 'green' },
  { label: 'Check Out', icon: LogOut, href: '/visits?status=checked_out', color: 'gray' },
  { label: 'Scan QR', icon: Scan, href: '/scanner', color: 'purple' },
  { label: 'Print Badge', icon: Printer, href: '/badges', color: 'amber' },
  { label: 'View Reports', icon: BarChart3, href: '/reports', color: 'indigo' },
  { label: 'Employees', icon: Users, href: '/employees', color: 'teal' },
  { label: 'Kiosk Mode', icon: QrCode, href: '/kiosk', color: 'orange' },
]

const colorStyles: Record<string, { bg: string; text: string; border: string; shadow: string; hoverShadow: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200/60', shadow: 'shadow-blue-500/10', hoverShadow: 'hover:shadow-blue-500/20' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200/60', shadow: 'shadow-green-500/10', hoverShadow: 'hover:shadow-green-500/20' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200/60', shadow: 'shadow-gray-500/10', hoverShadow: 'hover:shadow-gray-500/20' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200/60', shadow: 'shadow-purple-500/10', hoverShadow: 'hover:shadow-purple-500/20' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200/60', shadow: 'shadow-amber-500/10', hoverShadow: 'hover:shadow-amber-500/20' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200/60', shadow: 'shadow-indigo-500/10', hoverShadow: 'hover:shadow-indigo-500/20' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200/60', shadow: 'shadow-teal-500/10', hoverShadow: 'hover:shadow-teal-500/20' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200/60', shadow: 'shadow-orange-500/10', hoverShadow: 'hover:shadow-orange-500/20' },
}

export default function QuickActions() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500 mt-0.5">Frequently used operations</p>
      </div>
      <div className="p-4">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => {
            const colors = colorStyles[action.color] || colorStyles.blue
            return (
              <motion.button
                key={action.label}
                variants={fadeUp}
                custom={0}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(action.href)}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border ${colors.border} bg-white p-4 text-center transition-all duration-300 ${colors.hoverShadow} hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                <div className={`p-3 rounded-xl ${colors.bg} ${colors.text} transition-transform group-hover:scale-110`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{action.label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}
