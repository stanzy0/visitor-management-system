'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Filter, Download, RefreshCw, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import { fadeIn, hoverScale } from '@/lib/animations/variants'
import type { DashboardFilters } from '@/hooks/useDashboardData'

interface DashboardHeaderProps {
  userEmail: string
  userRole: string
  filters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  exporting: boolean
}

export default function DashboardHeader({
  userEmail,
  userRole,
  filters,
  onFilterChange,
  onExport,
  exporting,
}: DashboardHeaderProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 0)
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const greeting = mounted
    ? new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'
    : 'Welcome'

  const currentDate = mounted
    ? liveTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-gray-200/60 px-4 py-3 lg:px-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-gray-900 tracking-tight"
            >
              Executive Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-500"
            >
              {greeting}, {(userEmail || '').split('@')[0]} • {currentDate}
            </motion.p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono">
              {mounted ? liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block" />

          <motion.div {...hoverScale} className="relative">
            <select
              value={filters.range}
              onChange={(e) => onFilterChange({ range: e.target.value as DashboardFilters['range'] })}
              className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-gray-300"
            >
              {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'].map(f => (
                <option key={f.toLowerCase().replace(/\s/g, '')} value={f.toLowerCase().replace(/\s/g, '')}>{f}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </motion.div>

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </motion.button>

            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50 py-1 z-50"
                >
                  {[
                    { label: 'Export CSV', format: 'csv' as const },
                    { label: 'Export Excel', format: 'excel' as const },
                    { label: 'Export PDF', format: 'pdf' as const },
                  ].map(option => (
                    <button
                      key={option.format}
                      onClick={() => { onExport(option.format); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-200" />

          <motion.div>
            <NotificationBell />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 pl-3 border-l border-gray-200"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white">
              <span className="text-sm font-bold text-white">{(userRole || 'U').charAt(0).toUpperCase()}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
