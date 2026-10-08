'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, Settings, Download, RefreshCw, Filter, CalendarIcon } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import type { DashboardFilters } from '@/hooks/useDashboardData'
import { fadeUp, hoverScale } from '@/lib/animations/variants'

interface PremiumHeaderProps {
  userName?: string
  userRole: string
  filters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  exporting: boolean
  onMenuToggle?: () => void
  title?: string
  subtitle?: string
  showExport?: boolean
  showSettings?: boolean
  showFilter?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  assignedHostLabel?: string
  assignedHostName?: string
  roleLabel?: string
}

export default function PremiumHeader({
  userName,
  userRole,
  filters,
  onFilterChange,
  onExport,
  exporting,
  onMenuToggle,
  title,
  subtitle,
  showExport = true,
  showSettings = true,
  showFilter = true,
  searchValue,
  onSearchChange,
  assignedHostLabel,
  assignedHostName,
  roleLabel,
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

  const FILTERS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Custom Range', value: 'custom' },
  ]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30 border-b border-[rgba(85,107,47,0.35)] bg-[#10150D]/95 backdrop-blur-sm px-4 py-3 lg:px-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              aria-label="Toggle menu"
              className="lg:hidden p-2 -ml-2 rounded-xl text-[#9A9F87] hover:bg-[#4B5320]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50"
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
            className="text-xl font-bold text-[#F5F5DC] tracking-tight"
          >
            {userName ? `${greeting}, ${userName}` : (title ?? greeting)}
          </motion.h1>
          {title && userName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-medium text-gray-500"
            >
              {title}
            </motion.p>
          )}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
              className="text-xs font-medium text-[#9A9F87]"
          >
            {subtitle ?? currentDate}
          </motion.p>
        </div>
      </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center text-xs text-[#9A9F87] bg-[#10150D] px-3 py-1.5 rounded-xl border border-[rgba(85,107,47,0.35)] font-mono">
            <div className="h-2 w-2 rounded-full bg-[#6B8E23] animate-pulse mr-2" />
            {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <div className="h-5 w-px bg-[rgba(85,107,47,0.35)] hidden sm:block" />

          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search visitors..."
              aria-label="Search visitors"
              value={onSearchChange ? searchValue ?? '' : undefined}
              onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
              className="w-56 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] pl-10 pr-4 py-2 text-sm text-[#F5F5DC] placeholder-[#6B705A] focus:border-[#C8A646] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/20 transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9F87]" />
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

          <div className="h-5 w-px bg-[rgba(85,107,47,0.35)] hidden sm:block" />

          {showFilter && (
            <motion.div {...hoverScale} className="relative">
            <select
              value={filters.range}
              onChange={(e) => onFilterChange({ ...filters, range: e.target.value as DashboardFilters['range'] })}
              aria-label="Date filter"
              className="appearance-none rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] pl-3 pr-8 py-2 text-sm text-[#F5F5DC] focus:border-[#C8A646] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/20 transition-all cursor-pointer hover:border-[#C8A646]/60"
            >
              {FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9F87] pointer-events-none" />
            {filters.range === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <div className="relative">
                  <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9F87] pointer-events-none" />
                  <input
                    type="date"
                    value={filters.customFrom || ''}
                    onChange={(e) => onFilterChange({ ...filters, customFrom: e.target.value })}
                    className="appearance-none rounded-lg border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] pl-8 pr-2 py-1.5 text-xs text-[#F5F5DC] focus:border-[#C8A646] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/20"
                  />
                </div>
                <span className="text-xs text-[#9A9F87]">to</span>
                <div className="relative">
                  <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9F87] pointer-events-none" />
                  <input
                    type="date"
                    value={filters.customTo || ''}
                    onChange={(e) => onFilterChange({ ...filters, customTo: e.target.value })}
                    className="appearance-none rounded-lg border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] pl-8 pr-2 py-1.5 text-xs text-[#F5F5DC] focus:border-[#C8A646] focus:outline-none focus:ring-2 focus:ring-[#C8A646]/20"
                  />
                </div>
              </div>
            )}
            </motion.div>
          )}

          {showExport && (
            <div className="relative">
            <motion.button
              {...hoverScale}
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              aria-label="Export options"
              className="inline-flex items-center gap-2 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#0B0F08] px-4 py-2 text-sm font-medium text-[#F5F5DC] hover:bg-[#4B5320]/10 hover:border-[#C8A646]/40 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50"
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
                  className="absolute right-0 mt-2 w-40 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-lg py-1 z-50"
                >
                  {[
                    { label: 'Export CSV', format: 'csv' as const },
                    { label: 'Export Excel', format: 'excel' as const },
                    { label: 'Export PDF', format: 'pdf' as const },
                  ].map(option => (
                    <button
                      key={option.format}
                      onClick={() => { onExport(option.format); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-[#9A9F87] hover:bg-[#4B5320]/10 hover:text-[#F5F5DC] transition-colors focus:outline-none focus:ring-1 focus:ring-[#C8A646]/30 focus:mx-2 focus:my-1 rounded-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {showSettings && (
            <>
               <div className="h-5 w-px bg-[rgba(85,107,47,0.35)] hidden sm:block" />

               <motion.button
                 {...hoverScale}
                 onClick={() => router.push('/settings')}
                 aria-label="Settings"
                 className="p-2 rounded-xl text-[#9A9F87] hover:bg-[#4B5320]/10 hover:text-[#C8A646] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50"
               >
            <Settings className="h-5 w-5" />
            </motion.button>
            </>
          )}

          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3 pl-3 border-l border-[rgba(85,107,47,0.35)]"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-[#F5F5DC]">{userName || (roleLabel ?? userRole)}</p>
              {userName && <p className="text-xs text-[#9A9F87]">{roleLabel ?? userRole}</p>}
              {assignedHostName && (
                <p className="text-xs text-[#6B705A] mt-0.5">{assignedHostLabel}: {assignedHostName}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4B5320] to-[#556B2F] flex items-center justify-center text-[#F5F5DC] shadow-lg ring-2 ring-[#C8A646]/40">
              <span className="text-sm font-bold">{(userName || userRole || 'U').charAt(0).toUpperCase()}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
