'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Plus, X, Calendar, Clock, UserCheck, Search, Trash2, Eye } from 'lucide-react'
import { generateAppointmentQR, appointmentCheckInUrl } from '@/lib/qr/appointment-qr'

interface Visitor {
  id: string
  full_name: string
  visitor_organization: string | null
  photo_url?: string | null
}

interface Employee {
  id: string
  full_name: string
  office_location: string
}

interface Appointment {
  id: string
  appointment_number: string
  visitor_id: string
  employee_id: string
  office_location: string
  appointment_date: string
  appointment_time: string
  expected_duration: number
  purpose: string
  status: string
  notes: string | null
  created_at: string
  visitor?: Visitor | null
}

export default function HostAppointmentsPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null })
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)

  const [form, setForm] = useState({
    visitor_id: '',
    office_location: '',
    appointment_date: '',
    appointment_time: '',
    expected_duration: 30,
    purpose: '',
    notes: '',
  })

  const [visitors, setVisitors] = useState<Visitor[]>([])

  const fetchAppointments = async () => {
    if (!employeeId && userRole !== 'Admin') return
    setLoading(true)

    try {
      let query = supabase
        .from('appointments')
        .select('*, visitor:visitors(*)')
.order('appointment_date', { ascending: true })
         .order('expected_arrival', { ascending: true })

      if (userRole === 'Host Employee' && employeeId) {
        query = query.eq('employee_id', employeeId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      let filtered = data || []
      if (search) {
        filtered = filtered.filter(a =>
          a.visitor?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          a.purpose?.toLowerCase().includes(search.toLowerCase())
        )
      }

      setAppointments(filtered)
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchVisitors = async () => {
    const { data, error } = await supabase
      .from('visitors')
      .select('id, full_name, visitor_organization')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching visitors:', error)
    } else {
      setVisitors(data || [])
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserRole(user.role)

      if (user.role === 'Host Employee') {
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .single()
        if (empData) {
          setEmployeeId(empData.id)
        }
      } else if (user.role === 'Admin') {
        setEmployeeId('admin')
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (employeeId !== null) {
      setTimeout(() => {
        fetchAppointments()
        fetchVisitors()
      }, 0)
    }
  }, [employeeId, statusFilter, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('office_location')
        .eq('id', employeeId)
        .single()

      const payload = {
        ...form,
        employee_id: employeeId,
        office_location: form.office_location || employee?.office_location || '',
        appointment_number: `APT-${Date.now().toString(36).toUpperCase()}`,
        status: 'Scheduled',
        created_by: employeeId,
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()
        .single()

      if (error) {
        throw error
      }

      if (data) {
        await generateAppointmentQR(data.id)
      }

      setNotification({ type: 'success', message: 'Appointment created successfully' })
      setModalOpen(false)
      setForm({
        visitor_id: '',
        office_location: '',
        appointment_date: '',
        appointment_time: '',
        expected_duration: 30,
        purpose: '',
        notes: '',
      })
      fetchAppointments()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create appointment' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.appointmentId) return

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', deleteModal.appointmentId)

    if (error) {
      setNotification({ type: 'error', message: error.message })
    } else {
      setNotification({ type: 'success', message: 'Appointment cancelled' })
      fetchAppointments()
    }
    setDeleteModal({ open: false, appointmentId: null })
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    if (error) {
      setNotification({ type: 'error', message: error.message })
    } else {
      setNotification({ type: 'success', message: `Appointment ${newStatus.toLowerCase()}` })
      fetchAppointments()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700'
      case 'Arrived':
        return 'bg-amber-50 text-amber-700'
      case 'Checked In':
        return 'bg-green-50 text-green-700'
      case 'Completed':
        return 'bg-gray-50 text-gray-700'
      case 'Cancelled':
        return 'bg-red-50 text-red-700'
      case 'No Show':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  const canEdit = userRole === 'Admin' || userRole === 'Host Employee'

  if (!employeeId && userRole !== 'Admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">No employee record found for your account.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/host" className="text-sm text-blue-600 hover:underline">
            ← Back to Host Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500">Schedule and manage appointments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Arrived">Arrived</option>
              <option value="Checked In">Checked In</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
            {canEdit && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
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

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Duration</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {appt.visitor?.photo_url ? (
                          <img src={appt.visitor.photo_url} alt={appt.visitor.full_name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">{(appt.visitor?.full_name || 'V').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{appt.visitor?.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(appt.appointment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {appt.appointment_time ? new Date(`1970-01-01T${appt.appointment_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{appt.expected_duration} min</td>
                    <td className="px-4 py-3 text-gray-600">{appt.purpose || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedAppointment(appt); setQrModalOpen(true) }}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="QR Code"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        {canEdit && appt.status === 'Scheduled' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(appt.id, 'Arrived')}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                            >
                              <Clock className="h-3 w-3" />
                              Arrived
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, appointmentId: appt.id })}
                              className="p-1 rounded-md hover:bg-gray-100 text-red-600"
                              title="Cancel"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {appointments.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No appointments found</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">New Appointment</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visitor *</label>
                  <select
                    value={form.visitor_id}
                    onChange={(e) => setForm({ ...form, visitor_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                  >
                    <option value="">Select visitor</option>
                    {visitors.map((v) => (
                      <option key={v.id} value={v.id}>{v.full_name} {v.visitor_organization ? `(${v.visitor_organization})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={form.appointment_date}
                      onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={form.appointment_time}
                      onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={form.expected_duration}
                      onChange={(e) => setForm({ ...form, expected_duration: parseInt(e.target.value) || 30 })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
                    <input
                      type="text"
                      value={form.office_location}
                      onChange={(e) => setForm({ ...form, office_location: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                  <textarea
                    required
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Appointment QR Code</h2>
              <button onClick={() => setQrModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <img
                src={appointmentCheckInUrl(selectedAppointment.id)}
                alt="Appointment QR"
                className="w-48 h-48 mb-4"
              />
              <p className="text-sm text-gray-600">Scan this QR code at the reception</p>
              <p className="text-xs text-gray-500 mt-1">Appointment: {selectedAppointment.appointment_number}</p>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button onClick={() => setQrModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment</h2>
              <p className="text-sm text-gray-600 mt-2">Are you sure you want to cancel this appointment?</p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setDeleteModal({ open: false, appointmentId: null })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Keep</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Cancel Appointment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
