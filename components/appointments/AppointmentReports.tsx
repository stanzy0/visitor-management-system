'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Users, Building2 } from 'lucide-react'
import type { AppointmentReport } from '@/lib/types/appointment'

interface AppointmentReportsProps {
  report: AppointmentReport | null
  loading?: boolean
}

export default function AppointmentReports({ report, loading }: AppointmentReportsProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <p className="text-sm text-gray-500 text-center py-8">No report data available</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Appointment Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{report.completionRate}%</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Wait</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{report.averageWaitingMinutes} min</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-red-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">No Shows</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{report.noShows}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Peak Hour</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{report.peakHours[0]?.hour || '—'}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            By Department
          </h3>
          <div className="space-y-2">
            {report.byDepartment.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{dept.department}</span>
                <span className="text-sm font-semibold text-gray-900">{dept.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Peak Hours
          </h3>
          <div className="space-y-2">
            {report.peakHours.map((peak, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{peak.hour}</span>
                <span className="text-sm font-semibold text-gray-900">{peak.count} appointments</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
