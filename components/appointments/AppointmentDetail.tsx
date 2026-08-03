'use client'

import { motion } from 'framer-motion'
import { UserCheck, Printer, Mail, Download, Calendar, RefreshCw, CheckCircle2, XCircle, LogIn, LogOut, AlertTriangle, User, Building2, Clock, FileText } from 'lucide-react'
import type { Appointment } from '@/lib/types/appointment'

interface AppointmentDetailProps {
  appointment: Appointment
  qrDataUrl: string | null
  userRole: string
  onUpdateStatus: (status: string) => void
  onSendEmail: () => void
  onDownloadICS: () => void
  onReschedule: () => void
  onCancel: () => void
  onDelete: () => void
  onViewVisitor: () => void
  loading?: boolean
}

export default function AppointmentDetail({
  appointment,
  qrDataUrl,
  userRole,
  onUpdateStatus,
  onSendEmail,
  onDownloadICS,
  onReschedule,
  onCancel,
  onDelete,
  onViewVisitor,
  loading,
}: AppointmentDetailProps) {
  const canManage = userRole === 'Admin' || userRole === 'Receptionist'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col items-center">
              {appointment.visitor?.photo_url ? (
                <img
                  src={appointment.visitor.photo_url}
                  alt={appointment.visitor?.full_name || ''}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/10 mb-4"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-primary">{(appointment.visitor?.full_name || '?').charAt(0).toUpperCase()}</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{appointment.visitor?.full_name || '—'}</h2>
              <p className="text-sm text-gray-500">{appointment.visitor?.visitor_organization || '—'}</p>
              <button
                onClick={onViewVisitor}
                className="mt-3 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                View Full Profile
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Host</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.full_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.department || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.expected_duration} minutes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h3>
            {qrDataUrl ? (
              <div className="text-center">
                <img src={qrDataUrl} alt="QR Code" width={200} height={200} className="mx-auto mb-4 rounded-lg border border-gray-200" />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = qrDataUrl
                      a.download = `appointment-${appointment.id.slice(0, 8)}.png`
                      a.click()
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Generating QR...</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Purpose</p>
                  <p className="text-sm text-gray-900 font-medium">{appointment.purpose || '—'}</p>
                </div>
              </div>
              {appointment.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Notes</p>
                    <p className="text-sm text-gray-900">{appointment.notes}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                    appointment.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    appointment.status === 'Arrived' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    appointment.status === 'Checked In' ? 'bg-green-50 text-green-700 border-green-200' :
                    appointment.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    appointment.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {(appointment.status === 'Scheduled' || appointment.status === 'Arrived') && (
                <button
                  onClick={() => onUpdateStatus('Checked In')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors min-h-[52px]"
                >
                  <LogIn className="h-4 w-4" />
                  Check In
                </button>
              )}
              {appointment.status === 'Checked In' && (
                <button
                  onClick={() => onUpdateStatus('Completed')}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors min-h-[52px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </button>
              )}
              {appointment.status === 'Scheduled' && (
                <>
                  <button
                    onClick={() => onUpdateStatus('Arrived')}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-medium text-white hover:bg-amber-700 transition-colors min-h-[52px]"
                  >
                    <UserCheck className="h-4 w-4" />
                    Mark Arrived
                  </button>
                  <button
                    onClick={() => onUpdateStatus('No Show')}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white hover:bg-orange-700 transition-colors min-h-[52px]"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    No Show
                  </button>
                  <button
                    onClick={onReschedule}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[52px]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reschedule
                  </button>
                  <button
                    onClick={onCancel}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors min-h-[52px]"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={onSendEmail}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[52px]"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </button>
              <button
                onClick={onDownloadICS}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[52px]"
              >
                <Calendar className="h-4 w-4" />
                Download Calendar
              </button>
              {canManage && (
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors min-h-[52px]"
                >
                  <LogOut className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
