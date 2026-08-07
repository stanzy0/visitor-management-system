'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { fadeUp } from '@/lib/animations/variants'

export type ActionColor = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'indigo' | 'amber' | 'emerald' | 'purple' | 'teal'

const colorStyles: Record<ActionColor, { bg: string; text: string; hoverBg: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', hoverBg: 'group-hover:bg-blue-100', border: 'border-blue-200/60' },
  green: { bg: 'bg-green-50', text: 'text-green-600', hoverBg: 'group-hover:bg-green-100', border: 'border-green-200/60' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', hoverBg: 'group-hover:bg-orange-100', border: 'border-orange-200/60' },
  red: { bg: 'bg-red-50', text: 'text-red-600', hoverBg: 'group-hover:bg-red-100', border: 'border-red-200/60' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-600', hoverBg: 'group-hover:bg-gray-100', border: 'border-gray-200/60' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hoverBg: 'group-hover:bg-indigo-100', border: 'border-indigo-200/60' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', hoverBg: 'group-hover:bg-amber-100', border: 'border-amber-200/60' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hoverBg: 'group-hover:bg-emerald-100', border: 'border-emerald-200/60' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', hoverBg: 'group-hover:bg-purple-100', border: 'border-purple-200/60' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', hoverBg: 'group-hover:bg-teal-100', border: 'border-teal-200/60' },
}

interface QuickActionCardProps {
  label: string
  icon: LucideIcon
  href: string
  description?: string
  color?: ActionColor
  index?: number
}

export default function QuickActionCard({
  label,
  icon: Icon,
  href,
  description,
  color = 'blue',
  index = 0,
}: QuickActionCardProps) {
  const router = useRouter()
  const colors = colorStyles[color] || colorStyles.blue

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(href)}
      className={`group relative flex flex-col items-start gap-3 sm:gap-4 rounded-[20px] border ${colors.border} bg-white p-4 sm:p-5 text-left transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.12)] hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2`}
    >
      <div className={`p-4 rounded-xl ${colors.bg} ${colors.text} ${colors.hoverBg} transition-all duration-300 group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg
          className="h-5 w-5 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </motion.button>
  )
}
