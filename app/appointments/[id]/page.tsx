'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { Loader2, ArrowLeft } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { generateAppointmentQR } from '@/lib/qr/appointment-qr'
import { buildAppointmentConfirmationEmail } from '@/lib/email/appointment-email'
import { generateICS, downloadICS } from '@/lib/calendar/ics'
import type { Appointment } from '@/lib/types/appointment'
import AppointmentDetail from '@/components/appointments/AppointmentDetail'

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
    setActionLoading(true)
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: newStatus as Appointment['status'] })
        .eq('id', appointment.id)
        .select('*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department, office_location)')
        .single()

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
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!appointment) return
    setSendingEmail(true)
    try {
      const qr = qrDataUrl || (await generateAppointmentQR(appointment.id))
      const { subject, body } = buildAppointmentConfirmationEmail({ appointment, qrDataUrl: qr })
      await supabase.from('email_logs').insert({ recipient_email: appointment.visitor?.full_name || 'visitor@example.com', recipient_name: appointment.visitor?.full_name || 'Visitor', subject, template: 'appointment_created', status: 'pending', related_type: 'appointment', related_id: appointment.id })
      logAuditAction('Confirmation Email Sent', 'appointment', appointment.id, `Confirmation email sent for ${appointment.appointment_number}`)
      alert('Confirmation email queued')
    } catch (err) {
      console.error('Error sending email:', err)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleDownloadICS = () => {
    if (!appointment) return
    const ics = generateICS({
      appointment_number: appointment.appointment_number,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      expected_duration: appointment.expected_duration,
      purpose: appointment.purpose,
      office_location: appointment.office_location,
      visitor: appointment.visitor,
      employee: appointment.employee,
    })
    downloadICS(ics, `${appointment.appointment_number}.ics`)
    logAuditAction('Calendar Downloaded', 'appointment', appointment.id, `Calendar invite downloaded for ${appointment.appointment_number}`)
  }

  const handleReschedule = () => {
    if (!appointment) return
    const newDate = prompt('New date (YYYY-MM-DD):', appointment.appointment_date)
    const newTime = prompt('New time (HH:MM):', appointment.appointment_time)
    if (newDate && newTime) {
      supabase.from('appointments').update({ appointment_date: newDate, appointment_time: newTime }).eq('id', appointment.id).then(() => {
        setAppointment({ ...appointment, appointment_date: newDate, appointment_time: newTime })
        logAuditAction('Appointment Rescheduled', 'appointment', appointment.id, `Rescheduled to ${newDate} ${newTime}`)
        alert('Rescheduled')
      })
    }
  }

  const handleCancel = () => {
    if (!appointment) return
    const reason = prompt('Cancellation reason:')
    if (reason) {
      supabase.from('appointments').update({ status: 'Cancelled', notes: `${appointment.notes || ''}\nCancellation: ${reason}`.trim() }).eq('id', appointment.id).then(() => {
        setAppointment({ ...appointment, status: 'Cancelled' })
        logAuditAction('Appointment Cancelled', 'appointment', appointment.id, `Cancelled. Reason: ${reason}`)
        alert('Cancelled')
      })
    }
  }

  const handleDelete = async () => {
    if (!appointment) return
    if (!confirm('Delete this appointment?')) return
    await supabase.from('appointments').delete().eq('id', appointment.id)
    logAuditAction('Appointment Deleted', 'appointment', appointment.id, `Appointment ${appointment.appointment_number} deleted`)
    window.location.href = '/appointments'
  }

  const canManage = userRole === 'Admin' || userRole === 'Receptionist'

  if (authChecking || loading) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-dashboard-bg">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <Link href="/appointments" className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Appointments
            </Link>
          </div>
          <div className="rounded-[20px] border border-gray-200/60 bg-white p-12 shadow-[0_10px_30px_rgba(0,0,0,0.06)] text-center">
            <p className="text-gray-500">Appointment not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <Link href="/appointments" className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Link>
        </div>

        <AppointmentDetail
          appointment={appointment}
          qrDataUrl={qrDataUrl}
          userRole={userRole}
          onUpdateStatus={updateStatus}
          onSendEmail={handleSendEmail}
          onDownloadICS={handleDownloadICS}
          onReschedule={handleReschedule}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onViewVisitor={() => (window.location.href = `/visitors/${appointment.visitor_id}`)}
          loading={actionLoading}
        />
      </div>
    </div>
  )
}
