'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, XCircle, QrCode, Trash2, Eye, LogIn } from 'lucide-react'
import type { Appointment } from '@/lib/types/appointment'

interface AppointmentListProps {
  appointments: Appointment[]
  loading?: boolean
  onView: (appointment: Appointment) => void
  onCheckIn: (appointment: Appointment) => void
  onComplete: (appointment: Appointment) => void
  onReschedule: (appointment: Appointment) => void
  onCancel: (appointment: Appointment) => void
  onQR: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
  canDelete: boolean
}

export default function AppointmentList({
  appointments,
  loading,
  onView,
  onCheckIn,
  onComplete,
  onReschedule,
  onCancel,
  onQR,
  onDelete,
  canDelete,
}: AppointmentListProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 space-y-3">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        <div className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No appointments found</p>
          <p className="text-xs text-gray-400 mt-1">Create a new appointment to get started</p>
        </div>
      </motion.div>
    )
  }

  const statusConfig: Record<string, string> = {
    Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    Arrived: 'bg-amber-50 text-amber-700 border-amber-200',
    'Checked In': 'bg-green-50 text-green-700 border-green-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
    'No Show': 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Appointment</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Visitor</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Host</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {appointments.map((appt, index) => (
              <motion.tr
                key={appt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50/80 transition-colors"
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{appt.appointment_number}</p>
                  <p className="text-xs text-gray-500">{appt.office_location}</p>
                </td>
                <td className="px-5 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{appt.visitor?.full_name || '—'}</p>
                    <p className="text-xs text-gray-500">{appt.visitor?.visitor_organization || ''}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{appt.employee?.full_name || '—'}</p>
                    <p className="text-xs text-gray-500">{appt.employee?.department || ''}</p>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{appt.appointment_date}</td>
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{appt.appointment_time}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[appt.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {appt.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onView(appt)}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
                      aria-label="View appointment"
                    >
                      <Eye className="h-4 w-4" />
                    </motion.button>
                    {(appt.status === 'Scheduled' || appt.status === 'Arrived') && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onCheckIn(appt)}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
                        aria-label="Check in"
                      >
                        <LogIn className="h-4 w-4" />
                      </motion.button>
                    )}
                    {appt.status === 'Checked In' && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onComplete(appt)}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
                        aria-label="Complete"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </motion.button>
                    )}
                    {appt.status === 'Scheduled' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onReschedule(appt)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
                          aria-label="Reschedule"
                        >
                          <Clock className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onCancel(appt)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                          aria-label="Cancel"
                        >
                          <XCircle className="h-4 w-4" />
                        </motion.button>
                      </>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onQR(appt)}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
                      aria-label="QR code"
                    >
                      <QrCode className="h-4 w-4" />
                    </motion.button>
                    {canDelete && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(appt)}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
