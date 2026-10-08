'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { fadeUp } from '@/lib/animations/variants'

export type ActionColor = 'army' | 'olive' | 'gold' | 'olive-light' | 'red' | 'gray' | 'gold-light' | 'olive-dark' | 'muted' | 'olive-mid'

const colorStyles: Record<ActionColor, { bg: string; text: string; hoverBg: string; border: string }> = {
  army: { bg: 'bg-[#4B5320]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#4B5320]/30', border: 'border-[rgba(85,107,47,0.35)]' },
  olive: { bg: 'bg-[#556B2F]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#556B2F]/30', border: 'border-[rgba(85,107,47,0.35)]' },
  gold: { bg: 'bg-[#C8A646]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#C8A646]/30', border: 'border-[rgba(200,166,70,0.35)]' },
  'olive-light': { bg: 'bg-[#6B8E23]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#6B8E23]/30', border: 'border-[rgba(85,107,47,0.35)]' },
  red: { bg: 'bg-[#8B3A3A]/20', text: 'text-[#f87171]', hoverBg: 'group-hover:bg-[#8B3A3A]/30', border: 'border-[rgba(139,58,58,0.35)]' },
  gray: { bg: 'bg-[#9A9F87]/20', text: 'text-[#9A9F87]', hoverBg: 'group-hover:bg-[#9A9F87]/30', border: 'border-[rgba(154,159,135,0.35)]' },
  'gold-light': { bg: 'bg-[#B89635]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#B89635]/30', border: 'border-[rgba(200,166,70,0.35)]' },
  'olive-dark': { bg: 'bg-[#3D5A1E]/20', text: 'text-[#6B8E23]', hoverBg: 'group-hover:bg-[#3D5A1E]/30', border: 'border-[rgba(61,90,30,0.35)]' },
  muted: { bg: 'bg-[#6B705A]/20', text: 'text-[#9A9F87]', hoverBg: 'group-hover:bg-[#6B705A]/30', border: 'border-[rgba(107,112,90,0.35)]' },
  'olive-mid': { bg: 'bg-[#556B2F]/20', text: 'text-[#C8A646]', hoverBg: 'group-hover:bg-[#556B2F]/30', border: 'border-[rgba(85,107,47,0.35)]' },
}

interface QuickActionCardProps {
  label: string
  icon: LucideIcon
  href: string
  description?: string
  color?: ActionColor
  index?: number
  onClick?: () => void
}

export default function QuickActionCard({
  label,
  icon: Icon,
  href,
  description,
  color = 'army',
  index = 0,
  onClick,
}: QuickActionCardProps) {
  const router = useRouter()
  const colors = colorStyles[color] || colorStyles.army

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick ? onClick : () => router.push(href)}
      className={`group relative flex flex-col items-start gap-3 sm:gap-4 rounded-[20px] border ${colors.border} bg-[#10150D] p-4 sm:p-5 text-left transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.45)] hover:border-[rgba(200,166,70,0.4)] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50 focus:ring-offset-2`}
    >
      <div className={`p-4 rounded-xl ${colors.bg} ${colors.text} ${colors.hoverBg} transition-all duration-300 group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-[#F5F5DC]">{label}</h3>
        {description && (
          <p className="text-sm text-[#9A9F87] mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg
          className="h-5 w-5 text-[#9A9F87]"
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
