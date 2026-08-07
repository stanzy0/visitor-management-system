'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, Settings, Download, RefreshCw, Filter } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import type { DashboardFilters } from '@/hooks/useDashboardData'
import { fadeUp, hoverScale } from '@/lib/animations/variants'

interface PremiumHeaderProps {
  userEmail: string
  userRole: string
  filters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  exporting: boolean
  onMenuToggle?: () => void
}

export default function PremiumHeader({
  userEmail,
  userRole,
  filters,
  onFilterChange,
  onExport,
  exporting,
  onMenuToggle,
}: PremiumHeaderProps) {
  const router = useRouter()
  const [liveTime, setLiveTime] = useState(new Date())
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'

  const currentDate = liveTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const userTitle = userRole === 'Receptionist' ? 'Reception Officer' : userRole

  const FILTERS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Month', value: 'thisMonth' },
  ]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl px-4 py-3 lg:px-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              aria-label="Toggle menu"
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex flex-col">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-bold text-gray-900 tracking-tight"
          >
            {greeting},{' '}{userTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 font-mono"
          >
            {currentDate}
          </motion.p>
        </div>
      </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/60 font-mono">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
            {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search visitors..."
              aria-label="Search visitors"
              className="w-56 rounded-xl border border-gray-200 bg-gray-50/80 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <NotificationBell />
          </motion.div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <motion.div {...hoverScale} className="relative">
            <select
              value={filters.range}
              onChange={(e) => onFilterChange({ range: e.target.value as DashboardFilters['range'] })}
              aria-label="Date filter"
              className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:border-gray-300"
            >
              {FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </motion.div>

          <div className="relative">
            <motion.button
              {...hoverScale}
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              aria-label="Export options"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Export</span>
            </motion.button>

            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50"
                >
                  {[
                    { label: 'Export CSV', format: 'csv' as const },
                    { label: 'Export Excel', format: 'excel' as const },
                    { label: 'Export PDF', format: 'pdf' as const },
                  ].map(option => (
                    <button
                      key={option.format}
                      onClick={() => { onExport(option.format); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 focus:mx-2 focus:my-1 rounded-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <motion.button
            {...hoverScale}
            onClick={() => router.push('/settings')}
            aria-label="Settings"
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Settings className="h-5 w-5" />
          </motion.button>

          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3 pl-3 border-l border-gray-200"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white shadow-lg shadow-primary/30 ring-2 ring-white">
              <span className="text-sm font-bold">{(userRole || 'U').charAt(0).toUpperCase()}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
