'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { Loader2, ArrowLeft, LogIn, LogOut, CheckCircle2, XCircle, Trash2, QrCode, Printer, Mail, Download, Calendar, RefreshCw, UserCheck } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { generateAppointmentQR } from '@/lib/qr/appointment-qr'
import { buildAppointmentConfirmationEmail } from '@/lib/email/appointment-email'
import { generateICS, downloadICS } from '@/lib/calendar/ics'
import type { Appointment } from '@/lib/types/appointment'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Scheduled: ['Arrived', 'Cancelled', 'No Show'],
  Arrived: ['Checked In', 'No Show'],
  'Checked In': ['Completed'],
  Completed: [],
  Cancelled: [],
  'No Show': [],
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setAppointmentId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!appointmentId) return
    const fetchData = async () => {
      const user = await getCurrentUser()
      if (!user) { window.location.href = '/login'; return }
      setUserRole(user.role)
      const { data, error } = await supabase
        .from('appointments')
        .select('*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department, office_location)')
        .eq('id', appointmentId)
        .single()

      if (error) {
        console.error('Error fetching appointment:', error)
      } else {
        setAppointment(data as Appointment)
        if (data) {
          generateAppointmentQR(data.id).then(setQrDataUrl)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [appointmentId])

  const updateStatus = async (newStatus: string) => {
    if (!appointment) return
    const allowed = ALLOWED_TRANSITIONS[appointment.status] || []
    if (!allowed.includes(newStatus)) {
      alert(`Invalid transition from ${appointment.status} to ${newStatus}`)
      return
    }
    const { data, error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id).select('*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department, office_location)').single()
    if (error || !data) {
      alert(error?.message || 'Failed to update status')
      return
    }
    setAppointment(data as Appointment)
    logAuditAction(`Appointment ${newStatus}`, 'appointment', appointment.id, `Appointment ${appointment.appointment_number} marked as ${newStatus}`)
    if (newStatus === 'Checked In') {
      const visit = await supabase.from('visits').insert({ visitor_id: appointment.visitor_id, employee_id: appointment.employee_id, purpose: appointment.purpose, status: 'checked_in' }).select().single()
      const qr = await generateAppointmentQR(appointment.id)
      await supabase.from('appointments').update({ qr_code: qr }).eq('id', appointment.id)
      if (visit.data) await supabase.from('visits').update({ qr_code: qr }).eq('id', visit.data.id)
    }
    if (newStatus === 'Completed') {
      await supabase.from('visits').update({ status: 'checked_out', check_out_time: new Date().toISOString() }).eq('visitor_id', appointment.visitor_id).eq('employee_id', appointment.employee_id).eq('status', 'checked_in').order('created_at', { ascending: false }).limit(1)
    }
  }

  const handleSendEmail = async () => {
    if (!appointment) return
    setSendingEmail(true)
    const qr = qrDataUrl || (await generateAppointmentQR(appointment.id))
    const { subject, body } = buildAppointmentConfirmationEmail({ appointment, qrDataUrl: qr })
    await supabase.from('email_logs').insert({ recipient_email: appointment.visitor?.full_name || 'visitor@example.com', recipient_name: appointment.visitor?.full_name || 'Visitor', subject, template: 'appointment_created', status: 'pending', related_type: 'appointment', related_id: appointment.id })
    logAuditAction('Confirmation Email Sent', 'appointment', appointment.id, `Confirmation email sent for ${appointment.appointment_number}`)
    setSendingEmail(false)
    alert('Confirmation email queued')
  }

  const handleDownloadICS = () => {
    if (!appointment) return
    const ics = generateICS({ appointment_number: appointment.appointment_number, appointment_date: appointment.appointment_date, appointment_time: appointment.appointment_time, expected_duration: appointment.expected_duration, purpose: appointment.purpose, office_location: appointment.office_location, visitor: appointment.visitor, employee: appointment.employee })
    downloadICS(ics, `${appointment.appointment_number}.ics`)
    logAuditAction('Calendar Downloaded', 'appointment', appointment.id, `Calendar invite downloaded for ${appointment.appointment_number}`)
  }

  const canManage = userRole === 'Admin' || userRole === 'Receptionist'

  if (authChecking || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <Link href="/appointments" className="text-sm text-blue-600 hover:underline">
              ← Back to Appointments
            </Link>
          </div>
          <p className="text-gray-500">Appointment not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <Link href="/appointments" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex flex-col items-center">
                {appointment.visitor?.photo_url ? (
                  <img src={appointment.visitor.photo_url} alt={appointment.visitor?.full_name || ''} className="h-32 w-32 rounded-full object-cover mb-4" />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <span className="text-3xl text-gray-500">{(appointment.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">{appointment.visitor?.full_name || '—'}</h2>
                <p className="text-gray-600">{appointment.visitor?.visitor_organization || '—'}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Host Employee</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Department</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.department || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Office Location</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.office_location || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Appointment Number</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Time</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Expected Duration</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.expected_duration} minutes</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h3>
              {qrDataUrl ? (
                <div className="text-center">
                  <img src={qrDataUrl} alt="QR Code" width={220} height={220} className="mx-auto mb-4 rounded-lg border border-gray-200" />
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { const a = document.createElement('a'); a.href = qrDataUrl!; a.download = `appointment-${appointment.id.slice(0,8)}.png`; a.click() }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] inline-flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 min-h-[44px] inline-flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Generating QR...</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Purpose</p>
                  <p className="text-sm text-gray-900">{appointment.purpose || '—'}</p>
                </div>
                {appointment.notes && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Notes</p>
                    <p className="text-sm text-gray-900">{appointment.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">{appointment.status}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {(appointment.status === 'Scheduled' || appointment.status === 'Arrived') && (
                  <button onClick={() => updateStatus('Checked In')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]">
                    <LogIn className="h-4 w-4" />
                    Check In
                  </button>
                )}
                {appointment.status === 'Checked In' && (
                  <button onClick={() => updateStatus('Completed')} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 min-h-[52px]">
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </button>
                )}
                {appointment.status === 'Scheduled' && (
                  <>
                    <button onClick={() => updateStatus('Arrived')} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700 min-h-[52px]">
                      <UserCheck className="h-4 w-4" />
                      Mark Arrived
                    </button>
                    <button onClick={() => updateStatus('No Show')} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white hover:bg-orange-700 min-h-[52px]">
                      No Show
                    </button>
                    <button onClick={() => { const newDate = prompt('New date (YYYY-MM-DD):', appointment.appointment_date); const newTime = prompt('New time (HH:MM):', appointment.appointment_time); if (newDate && newTime) { supabase.from('appointments').update({ appointment_date: newDate, appointment_time: newTime }).eq('id', appointment.id).then(() => { setAppointment({ ...appointment, appointment_date: newDate, appointment_time: newTime }); logAuditAction('Appointment Rescheduled', 'appointment', appointment.id, `Rescheduled to ${newDate} ${newTime}`); alert('Rescheduled'); }) } }} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
                      <RefreshCw className="h-4 w-4" />
                      Reschedule
                    </button>
                    <button onClick={() => { const reason = prompt('Cancellation reason:'); if (reason) { supabase.from('appointments').update({ status: 'Cancelled', notes: `${appointment.notes || ''}\nCancellation: ${reason}`.trim() }).eq('id', appointment.id).then(() => { setAppointment({ ...appointment, status: 'Cancelled' }); logAuditAction('Appointment Cancelled', 'appointment', appointment.id, `Cancelled. Reason: ${reason}`); alert('Cancelled'); }) } }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 min-h-[52px]">
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                )}
                <Link href={`/visitors/${appointment.visitor_id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
                  View Visitor
                </Link>
                <button onClick={handleSendEmail} disabled={sendingEmail} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[52px]">
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send Email Again
                </button>
                <button onClick={handleDownloadICS} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
                  <Calendar className="h-4 w-4" />
                  Download Calendar
                </button>
                {canManage && (
                  <button onClick={async () => { if (confirm('Delete this appointment?')) { await supabase.from('appointments').delete().eq('id', appointment.id); logAuditAction('Appointment Deleted', 'appointment', appointment.id, `Appointment ${appointment.appointment_number} deleted`); alert('Deleted'); } }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 min-h-[52px]">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
