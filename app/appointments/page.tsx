'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Edit, Trash2, X, Loader2, Calendar, Clock, CheckCircle, XCircle, LogIn, LogOut, QrCode } from 'lucide-react'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { generateAppointmentQRCode } from '@/lib/appointment-qr'
import { createAdminNotification, createReceptionistNotification, createSecurityNotification, createHostEmployeeNotification } from '@/lib/notifications'

interface Appointment {
  id: string
  visitor_id: string
  employee_id: string
  appointment_date: string
  expected_arrival: string | null
  expected_departure: string | null
  purpose: string
  notes: string | null
  qr_code: string | null
  status: 'Scheduled' | 'Approved' | 'Rejected' | 'Checked In' | 'Checked Out' | 'Cancelled' | 'Expired' | 'No Show'
  created_at: string
  updated_at: string
  approved_by: string | null
  visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null } | null
  employee: { full_name: string; department: string; office_location: string } | null
}

interface Visitor {
  id: string
  full_name: string
  visitor_organization: string | null
}

interface Employee {
  id: string
  full_name: string
  department: string
  office_location: string
}

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

const STATUS_OPTIONS = ['Scheduled', 'Approved', 'Rejected', 'Checked In', 'Checked Out', 'Cancelled', 'Expired', 'No Show']

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null })
  const [deletingAppointment, setDeletingAppointment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('appointments')) {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      setAuthChecking(false)
      fetchAppointments()
      fetchVisitors()
      fetchEmployees()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location)
      `)
      .order('appointment_date', { ascending: true })
      .order('expected_arrival', { ascending: true })

    if (error) {
      showNotification('error', error.message)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  const fetchVisitors = async () => {
    const { data, error } = await supabase
      .from('visitors')
      .select('id, full_name, visitor_organization')
      .order('full_name')
    if (!error) {
      setVisitors(data || [])
    }
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, department, office_location')
      .order('full_name')
    if (!error) {
      setEmployees(data || [])
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAppointments(prev => {
              const exists = prev.some(a => a.id === (payload.new as Appointment).id)
              return exists ? prev : [payload.new as Appointment, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setAppointments(prev => prev.map(a => a.id === (payload.new as Appointment).id ? payload.new as Appointment : a))
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(a => a.id !== (payload.old as Appointment).id))
          }
        }
      )
      .subscribe()
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error, data } = await supabase.from('appointments').insert([{
      visitor_id: selectedVisitor,
      employee_id: selectedEmployee,
      appointment_date: appointmentDate,
      expected_arrival: appointmentTime,
      expected_departure: null,
      purpose,
      notes,
      status: 'Scheduled',
    }]).select(`
      *,
      visitor:visitors(full_name, visitor_organization),
      employee:employees(full_name, department, office_location)
    `)

    if (error) {
      showNotification('error', error.message)
    } else {
      const newAppointment = data?.[0]
      setAppointments(prev => {
        const exists = prev.some(a => a.id === newAppointment?.id)
        return exists ? prev : [...prev, newAppointment as Appointment]
      })
      logAuditAction('Appointment Created', 'appointment', data?.[0]?.id || null, `Appointment scheduled for ${visitors.find(v => v.id === selectedVisitor)?.full_name}`)
      showNotification('success', 'Appointment created successfully')
      createAdminNotification('Appointment Created', `Appointment scheduled for ${visitors.find(v => v.id === selectedVisitor)?.full_name} with ${employees.find(e => e.id === selectedEmployee)?.full_name}.`, 'appointment', 'appointment', data?.[0]?.id).catch(() => {})
      createReceptionistNotification('Appointment Created', `Appointment scheduled for ${visitors.find(v => v.id === selectedVisitor)?.full_name} with ${employees.find(e => e.id === selectedEmployee)?.full_name}.`, 'appointment', 'appointment', data?.[0]?.id).catch(() => {})
      createHostEmployeeNotification(selectedEmployee, 'Appointment Created', `Appointment scheduled for ${visitors.find(v => v.id === selectedVisitor)?.full_name} with ${employees.find(e => e.id === selectedEmployee)?.full_name}.`, 'appointment', 'appointment', data?.[0]?.id).catch(() => {})
      setModalOpen(false)
      resetForm()
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setAppointmentDate('')
    setAppointmentTime('')
    setSelectedVisitor('')
    setSelectedEmployee('')
    setPurpose('')
    setNotes('')
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus as Appointment['status'] } : a))
    
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'Approved') updates.approved_by = 'system'
    
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)

    if (error) {
      showNotification('error', error.message)
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'Scheduled' } : a))
    } else {
      const appointment = appointments.find(a => a.id === appointmentId)
      logAuditAction(`Appointment ${newStatus}`, 'appointment', appointmentId, `Status changed to ${newStatus}`)
      showNotification('success', `Appointment ${newStatus.toLowerCase()} successfully`)
      if (newStatus === 'Approved') {
        createReceptionistNotification('Appointment Approved', `Appointment for ${appointment?.visitor?.full_name || ' visitor'} with ${appointment?.employee?.full_name || 'host'} has been approved.`, 'appointment', 'appointment', appointmentId).catch(() => {})
        createHostEmployeeNotification(appointment?.employee_id || '', 'Appointment Approved', `Appointment for ${appointment?.visitor?.full_name || ' visitor'} has been approved.`, 'appointment', 'appointment', appointmentId).catch(() => {})
      } else if (newStatus === 'Rejected') {
        createReceptionistNotification('Appointment Rejected', `Appointment for ${appointment?.visitor?.full_name || ' visitor'} with ${appointment?.employee?.full_name || 'host'} has been rejected.`, 'appointment', 'appointment', appointmentId).catch(() => {})
        createHostEmployeeNotification(appointment?.employee_id || '', 'Appointment Rejected', `Appointment for ${appointment?.visitor?.full_name || ' visitor'} has been rejected.`, 'appointment', 'appointment', appointmentId).catch(() => {})
      }
    }
  }

  const handleCheckIn = async (appointment: Appointment) => {
    const { error: visitError, data: visitData } = await supabase.from('visits').insert([{
      visitor_id: appointment.visitor_id,
      employee_id: appointment.employee_id,
      purpose: appointment.purpose,
      status: 'approved',
    }]).select()

    if (visitError) {
      showNotification('error', visitError.message)
    } else {
      const visitId = visitData[0].id
      const qrCode = await generateAppointmentQRCode(appointment.id, visitId)
      
      setAppointments(prev => prev.map(a => a.id === appointment.id ? { ...a, status: 'Checked In', qr_code: qrCode } : a))
      
      await supabase.from('visits').update({ qr_code: qrCode }).eq('id', visitId)
      
      logAuditAction('Appointment Checked In', 'appointment', appointment.id, `${appointment.visitor?.full_name} checked in`)
      showNotification('success', 'Visitor checked in successfully')
      createAdminNotification('Appointment Checked In', `${appointment.visitor?.full_name} has checked in.`, 'appointment', 'appointment', appointment.id).catch(() => {})
      createReceptionistNotification('Appointment Checked In', `${appointment.visitor?.full_name} has checked in.`, 'appointment', 'appointment', appointment.id).catch(() => {})
      createSecurityNotification('Appointment Checked In', `${appointment.visitor?.full_name} has checked in.`, 'appointment', 'appointment', appointment.id).catch(() => {})
      createHostEmployeeNotification(appointment?.employee_id || '', 'Appointment Checked In', `${appointment?.visitor?.full_name || 'Visitor'} has checked in.`, 'appointment', 'appointment', appointment.id).catch(() => {})
    }
  }

  const statusColors: Record<string, string> = {
    Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    Approved: 'bg-green-50 text-green-700 border-green-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    'Checked In': 'bg-purple-50 text-purple-700 border-purple-200',
    'Checked Out': 'bg-gray-50 text-gray-700 border-gray-200',
    Cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    Expired: 'bg-amber-50 text-amber-700 border-amber-200',
    'No Show': 'bg-orange-50 text-orange-700 border-orange-200',
  }

  const handleDeleteClick = (appointment: Appointment) => {
    setDeleteModal({ open: true, appointmentId: appointment.id })
  }

  const handleDeleteConfirm = async () => {
    const { appointmentId } = deleteModal
    if (!appointmentId) return

    const appointmentToDelete = appointments.find(a => a.id === appointmentId)
    if (!appointmentToDelete) return

    setDeletingAppointment(true)
    setAppointments(prev => prev.filter(a => a.id !== appointmentId))

    const { error } = await supabase.from('appointments').delete().eq('id', appointmentId)

    if (error) {
      setAppointments(prev => [...prev, appointmentToDelete])
      showNotification('error', error.message)
    } else {
      logAuditAction('Appointment Deleted', 'appointment', appointmentId, `Appointment for ${appointmentToDelete.visitor?.full_name} with ${appointmentToDelete.employee?.full_name} on ${appointmentToDelete.appointment_date} deleted.`)
      showNotification('success', 'Appointment deleted successfully')
      createAdminNotification('Appointment Deleted', `Appointment for ${appointmentToDelete.visitor?.full_name} has been deleted.`, 'appointment', 'appointment', appointmentId).catch(() => {})
    }
    setDeletingAppointment(false)
    setDeleteModal({ open: false, appointmentId: null })
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ open: false, appointmentId: null })
  }

  const canDeleteAppointments = userRole === 'Admin' || userRole === 'Receptionist'

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      (a.visitor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.visitor?.visitor_organization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.employee?.department || '').toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchInputClasses}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {userRole !== 'Security' && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Appointment
              </button>
            )}
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Organization</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{appt.visitor?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{appt.visitor?.visitor_organization || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{appt.employee?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{appt.appointment_date}</td>
                      <td className="px-4 py-3 text-gray-600">{appt.expected_arrival || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[appt.status]}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {appt.status === 'Approved' && (
                            <button
                              onClick={() => handleCheckIn(appt)}
                              className="p-1 rounded-md hover:bg-blue-50 transition-colors"
                              title="Check In"
                            >
                              <LogIn className="h-4 w-4 text-blue-600" />
                            </button>
                          )}
                          {appt.qr_code && appt.status === 'Approved' && (
                            <button
                              onClick={() => { setSelectedAppointment(appt); setQrModalOpen(true) }}
                              className="p-1 rounded-md hover:bg-gray-50 transition-colors"
                              title="View QR"
                            >
                              <QrCode className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                          {appt.status === 'Scheduled' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(appt.id, 'Approved')}
                                className="p-1 rounded-md hover:bg-green-50 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(appt.id, 'Rejected')}
                                className="p-1 rounded-md hover:bg-red-50 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </button>
                            </>
                          )}
                          {canDeleteAppointments && (
                            <button
                              onClick={() => handleDeleteClick(appt)}
                              className="p-1 rounded-md hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">Create Appointment</h2>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visitor</label>
                    <select
                      value={selectedVisitor}
                      onChange={(e) => setSelectedVisitor(e.target.value)}
                      required
                      className={selectClasses}
                    >
                      <option value="">Select visitor</option>
                      {visitors.map(v => (
                        <option key={v.id} value={v.id}>{v.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      required
                      className={selectClasses}
                    >
                      <option value="">Select employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival</label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Enter purpose"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes"
                      className={inputClasses}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {qrModalOpen && selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Appointment QR Code</h2>
                <button onClick={() => setQrModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {selectedAppointment.qr_code ? (
                <div className="text-center">
                  <img src={selectedAppointment.qr_code} alt="QR Code" width={200} height={200} className="mx-auto mb-4" />
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = selectedAppointment.qr_code!
                        a.download = `appointment-${selectedAppointment.id.slice(0, 8)}.png`
                        a.click()
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Download
                    </button>
                    <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Print</button>
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
                <button
                  onClick={handleDeleteCancel}
                  disabled={deletingAppointment}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingAppointment}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deletingAppointment && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}