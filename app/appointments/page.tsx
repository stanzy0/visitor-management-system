'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { createAdminNotification, createReceptionistNotification, createSecurityNotification, createHostEmployeeNotification } from '@/lib/notifications'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth-client'
import { Search, Plus, X, Loader2, Calendar, Clock, UserCheck, CheckCircle2, XCircle, Trash2, LogIn, LogOut, QrCode, ChevronDown } from 'lucide-react'
import { generateAppointmentQR, appointmentCheckInUrl } from '@/lib/qr/appointment-qr'
import { buildAppointmentConfirmationEmail } from '@/lib/email/appointment-email'
import { generateICS, downloadICS } from '@/lib/calendar/ics'
import type { Appointment, AppointmentStats } from '@/lib/types/appointment'
import NotificationBell from '@/components/notifications/NotificationBell'

type Status = Appointment['status']

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  Scheduled: ['Arrived', 'Cancelled', 'No Show'],
  Arrived: ['Checked In', 'No Show'],
  'Checked In': ['Completed'],
  Completed: [],
  Cancelled: [],
  'No Show': [],
}

const STATUS_OPTIONS: Status[] = ['Scheduled', 'Arrived', 'Checked In', 'Completed', 'Cancelled', 'No Show']

const inputClasses = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[52px]'
const selectClasses = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[52px]'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [visitors, setVisitors] = useState<Array<{ id: string; full_name: string; visitor_organization: string | null }>>([])
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; department: string; office_location: string }>>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null })
  const [deletingAppointment, setDeletingAppointment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [form, setForm] = useState({
    visitor_id: '',
    employee_id: '',
    office_location: '',
    appointment_date: '',
    appointment_time: '',
    expected_duration: 30,
    purpose: '',
    notes: '',
  })

  const [reschedule, setReschedule] = useState<{ open: boolean; appointment: Appointment | null }>({ open: false, appointment: null })
  const [rescheduleForm, setRescheduleForm] = useState({ appointment_date: '', appointment_time: '', expected_duration: 30, office_location: '' })
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [cancelForm, setCancelForm] = useState<{ open: boolean; appointment: Appointment | null; reason: string }>({ open: false, appointment: null, reason: '' })
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const updateForm = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const fetchAppointments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department, office_location)')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) {
      showNotification('error', error.message)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  const fetchVisitors = async () => {
    const { data } = await supabase.from('visitors').select('id, full_name, visitor_organization').order('full_name')
    if (data) setVisitors(data)
  }

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, full_name, department, office_location').order('full_name')
    if (data) setEmployees(data)
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current)
    realtimeChannel.current = supabase.channel('appointments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setAppointments((prev) => {
          const exists = prev.some((a) => a.id === (payload.new as Appointment).id)
          return exists ? prev : [(payload.new as Appointment), ...prev]
        })
      } else if (payload.eventType === 'UPDATE') {
        setAppointments((prev) => prev.map((a) => (a.id === (payload.new as Appointment).id ? (payload.new as Appointment) : a)))
      } else if (payload.eventType === 'DELETE') {
        setAppointments((prev) => prev.filter((a) => a.id !== (payload.old as Appointment).id))
      }
    }).subscribe()
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) { window.location.href = '/login'; return }
      if (!PERMISSIONS[user.role]?.includes('appointments')) { window.location.href = '/unauthorized'; return }
      setUserRole(user.role)
      setAuthChecking(false)
      fetchAppointments()
      fetchVisitors()
      fetchEmployees()
      setupRealtime()
    }
    checkAuth()
    return () => {
      if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current)
    }
  }, [])

  const selectedEmployeeData = useMemo(() => employees.find((e) => e.id === form.employee_id), [employees, form.employee_id])

  const validatePastDateTime = (date: string, time: string) => {
    if (!date || !time) return 'Date and time are required.'
    const combined = new Date(`${date}T${time}`)
    if (combined.getTime() < Date.now() - 60 * 1000) return 'Appointment cannot be in the past.'
    return null
  }

  const checkDuplicate = async (visitorId: string, date: string, time: string, excludeId?: string) => {
    const start = new Date(`${date}T${time}`)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time')
      .eq('visitor_id', visitorId)
      .gte('appointment_date', date)
      .lt('appointment_date', new Date(end.getTime() + 86400000).toISOString().split('T')[0])
    if (!data) return false
    const duplicate = data.find((a) => a.id !== excludeId && new Date(`${a.appointment_date}T${a.appointment_time}`).getTime() === start.getTime())
    return !!duplicate
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const pastError = validatePastDateTime(form.appointment_date, form.appointment_time)
    if (pastError) {
      showNotification('error', pastError)
      setSubmitting(false)
      return
    }
    if (!form.visitor_id || !form.employee_id || !form.office_location || !form.appointment_date || !form.appointment_time || !form.purpose) {
      showNotification('error', 'Please fill all required fields.')
      setSubmitting(false)
      return
    }
    const duplicate = await checkDuplicate(form.visitor_id, form.appointment_date, form.appointment_time)
    if (duplicate) {
      showNotification('error', 'This visitor already has an appointment at this time.')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...form, status: 'Scheduled' }])
      .select('*, visitor:visitors(full_name, visitor_organization), employee:employees(full_name, department, office_location)')
      .single()

    if (error || !data) {
      showNotification('error', error?.message || 'Failed to create appointment')
      setSubmitting(false)
      return
    }

    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === data.id)
      return exists ? prev : [data, ...prev]
    })
    logAuditAction('Appointment Created', 'appointment', data.id, `Appointment ${data.appointment_number} created`)
    showNotification('success', 'Appointment created successfully')
    createAdminNotification('Appointment Created', `Appointment scheduled for ${data.visitor?.full_name} with ${data.employee?.full_name}.`, 'appointment', 'appointment', data.id).catch(() => {})
    createReceptionistNotification('Appointment Created', `Appointment scheduled for ${data.visitor?.full_name} with ${data.employee?.full_name}.`, 'appointment', 'appointment', data.id).catch(() => {})
    createHostEmployeeNotification(data.employee_id, 'Appointment Created', `Appointment scheduled for ${data.visitor?.full_name}.`, 'appointment', 'appointment', data.id).catch(() => {})
    setModalOpen(false)
    setForm({ visitor_id: '', employee_id: '', office_location: '', appointment_date: '', appointment_time: '', expected_duration: 30, purpose: '', notes: '' })
    setSubmitting(false)
  }

  const handleStatusAction = async (appointment: Appointment, newStatus: Status) => {
    const allowed = ALLOWED_TRANSITIONS[appointment.status as Status] || []
    if (!allowed.includes(newStatus)) {
      showNotification('error', `Invalid transition from ${appointment.status} to ${newStatus}`)
      return
    }

    if (newStatus === 'Cancelled') {
      setCancelForm({ open: true, appointment, reason: '' })
      return
    }

    const { data, error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id).select('*, visitor:visitors(full_name, visitor_organization), employee:employees(full_name, department, office_location)').single()
    if (error || !data) {
      showNotification('error', error?.message || 'Failed to update status')
      return
    }

    setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? data : a)))
    logAuditAction(`Appointment ${newStatus}`, 'appointment', appointment.id, `Appointment ${appointment.appointment_number} marked as ${newStatus}`)
    showNotification('success', `Appointment marked as ${newStatus}`)
    createAdminNotification(`Appointment ${newStatus}`, `Appointment for ${appointment.visitor?.full_name} marked as ${newStatus}.`, 'appointment', 'appointment', appointment.id).then(() => {}).catch(() => {})
    createHostEmployeeNotification(appointment.employee_id, `Appointment ${newStatus}`, `Your appointment with ${appointment.visitor?.full_name} is ${newStatus}.`, 'appointment', 'appointment', appointment.id).then(() => {}).catch(() => {})

    if (newStatus === 'Arrived') {
      await supabase.from('visits').insert({ visitor_id: appointment.visitor_id, employee_id: appointment.employee_id, purpose: appointment.purpose, status: 'approved' }).then(({ error }) => { if (error) console.error(error) })
    }
    if (newStatus === 'Checked In') {
      const { data: visit } = await supabase.from('visits').insert({ visitor_id: appointment.visitor_id, employee_id: appointment.employee_id, purpose: appointment.purpose, status: 'checked_in' }).select().single()
      const qr = await generateAppointmentQR(appointment.id)
      await supabase.from('appointments').update({ qr_code: qr }).eq('id', appointment.id)
      if (visit) await supabase.from('visits').update({ qr_code: qr }).eq('id', visit.id)
    }
    if (newStatus === 'Completed') {
      await supabase.from('visits').update({ status: 'checked_out', check_out_time: new Date().toISOString() }).eq('visitor_id', appointment.visitor_id).eq('employee_id', appointment.employee_id).eq('status', 'checked_in').order('created_at', { ascending: false }).limit(1).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const handleCheckIn = async (appointment: Appointment) => {
    await handleStatusAction(appointment, 'Checked In')
  }

  const openReschedule = (appointment: Appointment) => {
    setRescheduleForm({ appointment_date: appointment.appointment_date, appointment_time: appointment.appointment_time, expected_duration: appointment.expected_duration, office_location: appointment.office_location })
    setReschedule({ open: true, appointment })
  }

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reschedule.appointment) return
    setRescheduleSubmitting(true)
    const pastError = validatePastDateTime(rescheduleForm.appointment_date, rescheduleForm.appointment_time)
    if (pastError) {
      showNotification('error', pastError)
      setRescheduleSubmitting(false)
      return
    }
    const { data, error } = await supabase.from('appointments').update({ ...rescheduleForm, updated_at: new Date().toISOString() }).eq('id', reschedule.appointment.id).select('*, visitor:visitors(full_name, visitor_organization), employee:employees(full_name, department, office_location)').single()
    if (error || !data) {
      showNotification('error', error?.message || 'Failed to reschedule')
      setRescheduleSubmitting(false)
      return
    }
    setAppointments((prev) => prev.map((a) => (a.id === reschedule.appointment!.id ? data : a)))
    logAuditAction('Appointment Rescheduled', 'appointment', reschedule.appointment.id, `Appointment ${data.appointment_number} rescheduled to ${rescheduleForm.appointment_date} ${rescheduleForm.appointment_time}`)
    showNotification('success', 'Appointment rescheduled successfully')
    setReschedule({ open: false, appointment: null })
    setRescheduleSubmitting(false)
  }

  const handleCancelConfirm = async () => {
    if (!cancelForm.appointment) return
    setCancelSubmitting(true)
    const { data, error } = await supabase.from('appointments').update({ status: 'Cancelled', notes: `${cancelForm.appointment.notes || ''}\nCancellation: ${cancelForm.reason}`.trim() }).eq('id', cancelForm.appointment.id).select('*, visitor:visitors(full_name, visitor_organization), employee:employees(full_name, department, office_location)').single()
    if (error || !data) {
      showNotification('error', error?.message || 'Failed to cancel appointment')
      setCancelSubmitting(false)
      return
    }
    setAppointments((prev) => prev.map((a) => (a.id === cancelForm.appointment!.id ? data : a)))
    logAuditAction('Appointment Cancelled', 'appointment', cancelForm.appointment.id, `Appointment ${cancelForm.appointment.appointment_number} cancelled. Reason: ${cancelForm.reason}`)
    showNotification('success', 'Appointment cancelled')
    setCancelForm({ open: false, appointment: null, reason: '' })
    setCancelSubmitting(false)
  }

  const handleSendEmail = async (appointment: Appointment) => {
    const qr = appointment.qr_code || (await generateAppointmentQR(appointment.id))
    const { subject, body } = buildAppointmentConfirmationEmail({ appointment, qrDataUrl: qr })
    await supabase.from('email_logs').insert({ recipient_email: appointment.visitor?.full_name || 'visitor@example.com', recipient_name: appointment.visitor?.full_name || 'Visitor', subject, template: 'appointment_created', status: 'pending', related_type: 'appointment', related_id: appointment.id })
    await logAuditAction('Confirmation Email Sent', 'appointment', appointment.id, `Confirmation email sent for ${appointment.appointment_number}`)
    showNotification('success', 'Confirmation email queued')
  }

  const handleDownloadICS = async (appointment: Appointment) => {
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
    await logAuditAction('Calendar Downloaded', 'appointment', appointment.id, `Calendar invite downloaded for ${appointment.appointment_number}`)
    showNotification('success', 'Calendar invite downloaded')
  }

  const canCreate = userRole !== 'Security'
  const canDelete = userRole === 'Admin' || userRole === 'Receptionist'

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      (a.visitor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.visitor?.visitor_organization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.employee?.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.appointment_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500">Schedule and manage visitor appointments</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {canCreate && (
              <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]">
                <Plus className="h-4 w-4" />
                New Appointment
              </button>
            )}
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search appointments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputClasses} pl-9`} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClasses}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Appointment</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{appt.appointment_number}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{appt.visitor?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">{appt.visitor?.visitor_organization || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{appt.employee?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">{appt.employee?.department || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{appt.appointment_date}</td>
                    <td className="px-4 py-3 text-gray-600">{appt.appointment_time}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {(appt.status === 'Scheduled' || appt.status === 'Arrived') && (
                          <button onClick={() => handleCheckIn(appt)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                            <LogIn className="h-3.5 w-3.5" />
                            Check In
                          </button>
                        )}
                        {appt.status === 'Checked In' && (
                          <button onClick={() => handleStatusAction(appt, 'Completed')} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </button>
                        )}
                        {appt.status === 'Scheduled' && (
                          <>
                            <button onClick={() => openReschedule(appt)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                              Reschedule
                            </button>
                            <button onClick={() => handleStatusAction(appt, 'Cancelled')} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                              Cancel
                            </button>
                            <button onClick={() => handleStatusAction(appt, 'No Show')} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                              No Show
                            </button>
                          </>
                        )}
                        <button onClick={() => { setSelectedAppointment(appt); setQrModalOpen(true) }} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                          <QrCode className="h-3.5 w-3.5" />
                          QR
                        </button>
                        <button onClick={() => handleSendEmail(appt)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                          Email
                        </button>
                        <button onClick={() => handleDownloadICS(appt)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                          ICS
                        </button>
                        {canDelete && (
                          <button onClick={() => setDeleteModal({ open: true, appointmentId: appt.id })} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[44px]">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">New Appointment</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visitor *</label>
                <select value={form.visitor_id} onChange={(e) => updateForm('visitor_id', e.target.value)} required className={selectClasses}>
                  <option value="">Select visitor</option>
                  {visitors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee *</label>
                <select value={form.employee_id} onChange={(e) => updateForm('employee_id', e.target.value)} required className={selectClasses}>
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.department}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEmployeeData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input type="text" value={selectedEmployeeData.department} readOnly className={`${inputClasses} bg-gray-50`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
                    <input type="text" value={selectedEmployeeData.office_location} readOnly className={`${inputClasses} bg-gray-50`} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date *</label>
                  <input type="date" value={form.appointment_date} onChange={(e) => updateForm('appointment_date', e.target.value)} required className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Time *</label>
                  <input type="time" value={form.appointment_time} onChange={(e) => updateForm('appointment_time', e.target.value)} required className={inputClasses} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Duration (minutes)</label>
                <input type="number" value={form.expected_duration} onChange={(e) => updateForm('expected_duration', Number(e.target.value))} className={inputClasses} min={15} step={15} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input type="text" value={form.purpose} onChange={(e) => updateForm('purpose', e.target.value)} required className={inputClasses} placeholder="Meeting purpose" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} className={inputClasses} rows={3} placeholder="Additional notes" />
              </div>
            </form>
            <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                Cancel
              </button>
              <button type="submit" disabled={submitting} onClick={handleCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Appointment QR Code</h2>
              <button onClick={() => setQrModalOpen(false)} className="p-2 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedAppointment.qr_code ? (
              <div className="text-center">
                <img src={selectedAppointment.qr_code} alt="QR Code" width={220} height={220} className="mx-auto mb-4 rounded-lg border border-gray-200" />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = selectedAppointment.qr_code!
                      a.download = `appointment-${selectedAppointment.id.slice(0, 8)}.png`
                      a.click()
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
                  >
                    Download
                  </button>
                  <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 min-h-[44px]">
                    Print
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center">No QR code available</p>
            )}
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Appointment?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal({ open: false, appointmentId: null })} disabled={deletingAppointment} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { appointmentId } = deleteModal
                  if (!appointmentId) return
                  const target = appointments.find((a) => a.id === appointmentId)
                  if (!target) return
                  setDeletingAppointment(true)
                  setAppointments((prev) => prev.filter((a) => a.id !== appointmentId))
                  const { error } = await supabase.from('appointments').delete().eq('id', appointmentId)
                  if (error) {
                    setAppointments((prev) => [...prev, target])
                    showNotification('error', error.message)
                  } else {
                    logAuditAction('Appointment Deleted', 'appointment', appointmentId, `Appointment for ${target.visitor?.full_name} deleted`)
                    showNotification('success', 'Appointment deleted successfully')
                  }
                  setDeletingAppointment(false)
                  setDeleteModal({ open: false, appointmentId: null })
                }}
                disabled={deletingAppointment}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
              >
                {deletingAppointment && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {reschedule.open && reschedule.appointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Reschedule Appointment</h2>
              <button onClick={() => setReschedule({ open: false, appointment: null })} className="p-2 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={rescheduleForm.appointment_date} onChange={(e) => setRescheduleForm((prev) => ({ ...prev, appointment_date: e.target.value }))} required className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={rescheduleForm.appointment_time} onChange={(e) => setRescheduleForm((prev) => ({ ...prev, appointment_time: e.target.value }))} required className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input type="number" value={rescheduleForm.expected_duration} onChange={(e) => setRescheduleForm((prev) => ({ ...prev, expected_duration: Number(e.target.value) }))} className={inputClasses} min={15} step={15} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
                <input type="text" value={rescheduleForm.office_location} onChange={(e) => setRescheduleForm((prev) => ({ ...prev, office_location: e.target.value }))} className={inputClasses} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setReschedule({ open: false, appointment: null })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={rescheduleSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
                  {rescheduleSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Please provide a cancellation reason.</p>
            <textarea value={cancelForm.reason} onChange={(e) => setCancelForm((prev) => ({ ...prev, reason: e.target.value }))} className={inputClasses} rows={3} placeholder="Cancellation reason" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCancelForm({ open: false, appointment: null, reason: '' })} disabled={cancelSubmitting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]">
                Back
              </button>
              <button onClick={handleCancelConfirm} disabled={cancelSubmitting || !cancelForm.reason.trim()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]">
                {cancelSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
