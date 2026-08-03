'use client'

import { motion } from 'framer-motion'
import { Search, X, Download, FileText, FileSpreadsheet, Printer, CalendarIcon } from 'lucide-react'

interface ReportFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  dateRange: string
  onDateRangeChange: (value: string) => void
  customDateFrom: string
  onCustomDateFromChange: (value: string) => void
  customDateTo: string
  onCustomDateToChange: (value: string) => void
  department: string
  onDepartmentChange: (value: string) => void
  departments: string[]
  status: string
  onStatusChange: (value: string) => void
  onExport: (format: 'pdf' | 'excel' | 'csv' | 'print') => void
  exporting: boolean
  children?: React.ReactNode
}

export default function ReportFilters({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  department,
  onDepartmentChange,
  departments,
  status,
  onStatusChange,
  onExport,
  exporting,
  children,
}: ReportFiltersProps) {
  const hasFilters = searchTerm || dateRange !== 'today' || department || status || customDateFrom || customDateTo

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisYear">This Year</option>
          <option value="custom">Custom Range</option>
        </select>

        {dateRange === 'custom' && (
          <>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => onCustomDateFromChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => onCustomDateToChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </>
        )}

        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Status</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Arrived">Arrived</option>
          <option value="Checked In">Checked In</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="No Show">No Show</option>
        </select>

        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={() => {
                onSearchChange('')
                onDateRangeChange('today')
                onDepartmentChange('')
                onStatusChange('')
                onCustomDateFromChange('')
                onCustomDateToChange('')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <div className="relative group">
            <button
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => onExport('pdf')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
                <FileText className="h-4 w-4" /> Export PDF
              </button>
              <button onClick={() => onExport('excel')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </button>
              <button onClick={() => onExport('csv')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
              </button>
              <button onClick={() => onExport('print')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  )
}
