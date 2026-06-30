'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { logAuditAction } from '@/lib/audit'
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Bell,
  Loader2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Search,
  Timer,
  UserX,
  MessageSquare,
  X,
} from 'lucide-react'
import { generateVisitQRCode } from '@/lib/qrcode'

interface Employee {
  id: string
  full_name: string
  department: string
  office_location: string
}

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string | null
  photo_url: string | null
}

interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: string
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: Visitor | null
  employee: Employee | null
}

interface Appointment {
  id: string
  visitor_id: string
  employee_id: string
  appointment_date: string
  expected_arrival: string | null
  purpose: string
  status: string
  visitor: Visitor | null
  employee: Employee | null
}

interface Stats {
  visitorsToday: number
  expectedToday: number
  waiting: number
  atReception: number
  upcomingAppointments: number
  completedThisWeek: number
  pendingApprovals: number
  onSite: number
  avgDuration: string
}

export default function HostPortalPage() {
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [waitingVisitors, setWaitingVisitors] = useState<Visit[]>([])
  const [stats, setStats] = useState<Stats>({
    visitorsToday: 0,
    expectedToday: 0,
    waiting: 0,
    atReception: 0,
    upcomingAppointments: 0,
    completedThisWeek: 0,
    pendingApprovals: 0,
    onSite: 0,
    avgDuration: '0 min',
  })
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showPreRegister, setShowPreRegister] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preRegisterData, setPreRegisterData] = useState({
    full_name: '',
    email: '',
    phone: '',
    visitor_organization: '',
    appointment_date: '',
    expected_arrival: '',
    purpose: '',
    vehicle_type: '',
    registration_number: '',
    id_number: '',
  })
  const [watchlistHit, setWatchlistHit] = useState<any | null>(null)
  const [showWatchlistWarning, setShowWatchlistWarning] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('host')) {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)

      if (user.role === 'Host Employee') {
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (empData) {
          setEmployee(empData)
          setEmployeeId(empData.id)
        }
      }

      setAuthChecking(false)
      fetchData()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchData = async () => {
    if (!employeeId && userRole === 'Host Employee') return
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      let appointmentQuery = supabase
        .from('appointments')
        .select('*, visitor:visitors(*), employee:employees(*)')
        .order('appointment_date', { ascending: true })

      let visitQuery = supabase
        .from('visits')
        .select('*, visitor:visitors(*), employee:employees(*)')
        .order('created_at', { ascending: false })

      if (userRole === 'Host Employee' && employeeId) {
        appointmentQuery = appointmentQuery.eq('employee_id', employeeId)
        visitQuery = visitQuery.eq('employee_id', employeeId)
      }

      const [apptRes, visitRes, todayApptRes, completedRes, pendingRes, waitingRes, onSiteRes] = await Promise.all([
        appointmentQuery,
        visitQuery,
        appointmentQuery.eq('appointment_date', today),
        visitQuery.gte('created_at', weekStart).eq('status', 'checked_out'),
        appointmentQuery.eq('status', 'pending'),
        visitQuery.eq('status', 'checked_in'),
        visitQuery.eq('status', 'checked_in'),
      ])

      setAppointments(apptRes.data || [])
      setVisits(visitRes.data || [])

      const waiting = (waitingRes.data || []).filter(v => !v.check_out_time)
      setWaitingVisitors(waiting)

      const todayVisits = (visitRes.data || []).filter(v => {
        const d = new Date(v.created_at).toISOString().split('T')[0]
        return d === today
      })

      let totalDuration = 0
      let durationCount = 0
      ;(visitRes.data || []).forEach(v => {
        if (v.check_in_time && v.check_out_time) {
          const mins = (new Date(v.check_out_time).getTime() - new Date(v.check_in_time).getTime()) / (1000 * 60)
          totalDuration += mins
          durationCount++
        }
      })
      const avgMin = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0

      setStats({
        visitorsToday: todayVisits.length,
        expectedToday: (todayApptRes.data || []).length,
        waiting: waiting.length,
        atReception: (onSiteRes.data || []).length,
        upcomingAppointments: (apptRes.data || []).filter(a => a.status === 'approved' || a.status === 'pending').length,
        completedThisWeek: (completedRes.data || []).length,
        pendingApprovals: (pendingRes.data || []).length,
        onSite: (onSiteRes.data || []).length,
        avgDuration: `${avgMin} min`,
      })
    } catch (err) {
      console.error('Error fetching host data:', err)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('host-portal-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe()
  }

  const handleApproveAppointment = async (appointment: Appointment) => {
    setActionLoading(appointment.id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'approved' })
      .eq('id', appointment.id)

    if (error) {
      showNotification('error', error.message)
    } else {
      const visitorName = appointment.visitor?.full_name || 'Visitor'
      logAuditAction('Host Approved Appointment', 'appointment', appointment.id, `${visitorName}'s appointment approved by host`)
      showNotification('success', 'Appointment approved')
      fetchData()
    }
    setActionLoading(null)
  }

  const handleRejectAppointment = async (appointment: Appointment) => {
    setActionLoading(appointment.id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'rejected' })
      .eq('id', appointment.id)

    if (error) {
      showNotification('error', error.message)
    } else {
      const visitorName = appointment.visitor?.full_name || 'Visitor'
      logAuditAction('Host Rejected Appointment', 'appointment', appointment.id, `${visitorName}'s appointment rejected by host`)
      showNotification('success', 'Appointment rejected')
      fetchData()
    }
    setActionLoading(null)
  }

  const handleAdmitVisitor = async (visit: Visit) => {
    setActionLoading(visit.id)
    const { error } = await supabase
      .from('visits')
      .update({ status: 'checked_in', check_in_time: new Date().toISOString() })
      .eq('id', visit.id)

    if (error) {
      showNotification('error', error.message)
    } else {
      logAuditAction('Host Admitted Visitor', 'visit', visit.id, `${visit.visitor?.full_name} admitted by host`)
      showNotification('success', 'Visitor admitted')
      fetchData()
    }
    setActionLoading(null)
  }

  const handleRequestAssistance = async (visit: Visit) => {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: null,
        title: 'Host Requested Assistance',
        message: `${employee?.full_name || 'Host'} needs assistance with visitor ${visit.visitor?.full_name || 'Unknown'}`,
        type: 'system',
        recipient_role: 'Receptionist',
        is_read: false,
        related_type: 'visit',
        related_id: visit.id,
      },
    ])
    if (error) {
      showNotification('error', error.message)
    } else {
      logAuditAction('Host Requested Assistance', 'visit', visit.id, `Assistance requested for ${visit.visitor?.full_name}`)
      showNotification('success', 'Reception has been notified')
    }
  }

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const user = await getCurrentUser()
    if (!user || !employeeId) return

    const hit = await checkWatchlist(preRegisterData)
    if (hit) {
      setShowWatchlistWarning(true)
      setSubmitting(false)
      return
    }

    const { data: visitorData, error: visitorError } = await supabase
      .from('visitors')
      .insert([
        {
          full_name: preRegisterData.full_name,
          email: preRegisterData.email,
          phone: preRegisterData.phone,
          visitor_organization: preRegisterData.visitor_organization,
          photo_url: null,
        },
      ])
      .select()

    if (visitorError) {
      showNotification('error', visitorError.message)
      setSubmitting(false)
      return
    }

    const { data: apptData, error: apptError } = await supabase
      .from('appointments')
      .insert([
        {
          visitor_id: visitorData![0].id,
          employee_id: employeeId,
          appointment_date: preRegisterData.appointment_date,
          expected_arrival: preRegisterData.expected_arrival || null,
          purpose: preRegisterData.purpose,
          status: 'approved',
        },
      ])
      .select()

    if (apptError) {
      showNotification('error', apptError.message)
    } else {
      await generateVisitQRCode(apptData![0].id)
      logAuditAction('Host Created Appointment', 'appointment', apptData![0].id, `Host pre-registered ${preRegisterData.full_name}`)
      showNotification('success', 'Visitor pre-registered successfully')
      setShowPreRegister(false)
      setPreRegisterData({
        full_name: '',
        email: '',
        phone: '',
        visitor_organization: '',
        appointment_date: '',
        expected_arrival: '',
        purpose: '',
        vehicle_type: '',
        registration_number: '',
        id_number: '',
      })
      fetchData()
    }
    setSubmitting(false)
  }

  const checkWatchlist = async (data: typeof preRegisterData): Promise<boolean> => {
    const { data: hit } = await supabase
      .from('visitor_watchlist')
      .select('*')
      .eq('status', 'Active')
      .or(`full_name.ilike.%${data.full_name}%,phone.ilike.%${data.phone}%,email.ilike.%${data.email}%`)
      .maybeSingle()

    if (hit) {
      setWatchlistHit(hit)
      return true
    }
    return false
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const canEdit = userRole === 'Admin' || userRole === 'Host Employee'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Host Portal</h1>
            <p className="text-sm text-gray-500">
              {employee ? `Welcome, ${employee.full_name}` : 'Manage your visitors and appointments'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowPreRegister(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Pre-Register Visitor
            </button>
          )}
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Visitors Today" value={stats.visitorsToday.toString()} icon={Users} color="blue" />
          <SummaryCard title="Expected Today" value={stats.expectedToday.toString()} icon={Calendar} color="green" />
          <SummaryCard title="Waiting" value={stats.waiting.toString()} icon={Timer} color="amber" />
          <SummaryCard title="At Reception" value={stats.atReception.toString()} icon={UserCheck} color="purple" />
          <SummaryCard title="Upcoming Appointments" value={stats.upcomingAppointments.toString()} icon={Calendar} color="indigo" />
          <SummaryCard title="Completed This Week" value={stats.completedThisWeek.toString()} icon={CheckCircle} color="green" />
          <SummaryCard title="Pending Approvals" value={stats.pendingApprovals.toString()} icon={Clock} color="red" />
          <SummaryCard title="On Site" value={stats.onSite.toString()} icon={Users} color="blue" />
        </div>

        {/* Waiting Visitors */}
        {waitingVisitors.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="p-4 border-b border-amber-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Waiting Visitors
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-100">
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Arrived</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200">
                  {waitingVisitors.map((visit) => (
                    <tr key={visit.id} className="hover:bg-amber-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {visit.visitor?.photo_url ? (
                            <img src={visit.visitor.photo_url} alt={visit.visitor.full_name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">{(visit.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {visit.check_in_time ? new Date(visit.check_in_time).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleAdmitVisitor(visit)}
                              disabled={actionLoading === visit.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === visit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Admit
                            </button>
                          )}
                          <button
                            onClick={() => handleRequestAssistance(visit)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Assist
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Organization</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Expected Arrival</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments
                  .filter(a => a.status === 'pending' || a.status === 'approved')
                  .map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {appt.visitor?.photo_url ? (
                            <img src={appt.visitor.photo_url} alt={appt.visitor.full_name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">{(appt.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{appt.visitor?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{appt.visitor?.visitor_organization || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(appt.appointment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {appt.expected_arrival ? new Date(appt.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{appt.purpose || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          appt.status === 'approved' ? 'bg-green-50 text-green-700' :
                          appt.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {appt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedAppointment(appt); setShowDetailsModal(true) }}
                            className="p-1 rounded-md hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          {canEdit && appt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveAppointment(appt)}
                                disabled={actionLoading === appt.id}
                                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectAppointment(appt)}
                                disabled={actionLoading === appt.id}
                                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Reject
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
          {appointments.filter(a => a.status === 'pending' || a.status === 'approved').length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming appointments</p>
            </div>
          )}
        </div>

        {/* Visitor History */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Visitor History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visits.slice(0, 20).map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {visit.visitor?.photo_url ? (
                          <img src={visit.visitor.photo_url} alt={visit.visitor.full_name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">{(visit.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        visit.status === 'checked_in' ? 'bg-green-50 text-green-700' :
                        visit.status === 'checked_out' ? 'bg-gray-50 text-gray-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {visit.check_in_time && visit.check_out_time
                        ? `${Math.round((new Date(visit.check_out_time).getTime() - new Date(visit.check_in_time).getTime()) / (1000 * 60))} min`
                        : visit.check_in_time ? 'In progress' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visits.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No visit history</p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Register Modal */}
      {showPreRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Pre-Register Visitor</h2>
              <button onClick={() => setShowPreRegister(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePreRegister} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={preRegisterData.full_name} onChange={(e) => setPreRegisterData({ ...preRegisterData, full_name: e.target.value })} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={preRegisterData.email} onChange={(e) => setPreRegisterData({ ...preRegisterData, email: e.target.value })} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={preRegisterData.phone} onChange={(e) => setPreRegisterData({ ...preRegisterData, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                    <input type="text" value={preRegisterData.visitor_organization} onChange={(e) => setPreRegisterData({ ...preRegisterData, visitor_organization: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date *</label>
                    <input type="date" value={preRegisterData.appointment_date} onChange={(e) => setPreRegisterData({ ...preRegisterData, appointment_date: e.target.value })} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival</label>
                    <input type="time" value={preRegisterData.expected_arrival} onChange={(e) => setPreRegisterData({ ...preRegisterData, expected_arrival: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                  <textarea value={preRegisterData.purpose} onChange={(e) => setPreRegisterData({ ...preRegisterData, purpose: e.target.value })} required rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vehicle Information (Optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select value={preRegisterData.vehicle_type} onChange={(e) => setPreRegisterData({ ...preRegisterData, vehicle_type: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black">
                        <option value="">Select type</option>
                        {['Car', 'SUV', 'Truck', 'Bus', 'Motorcycle', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                      <input type="text" value={preRegisterData.registration_number} onChange={(e) => setPreRegisterData({ ...preRegisterData, registration_number: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number (Optional)</label>
                  <input type="text" value={preRegisterData.id_number} onChange={(e) => setPreRegisterData({ ...preRegisterData, id_number: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black" />
                </div>
              </div>
              <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowPreRegister(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register & Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Warning Modal */}
      {showWatchlistWarning && watchlistHit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border-2 border-red-500">
            <div className="p-6 text-center border-b border-red-100 bg-red-50">
              <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-red-900">SECURITY ALERT</h2>
              <p className="text-sm text-red-700 mt-2">This visitor appears on the Watchlist.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Name</span>
                <p className="text-sm font-semibold text-gray-900">{watchlistHit.full_name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Category</span>
                <p className="text-sm text-gray-900">{watchlistHit.category}</p>
              </div>
              {watchlistHit.reason && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Reason</span>
                  <p className="text-sm text-gray-900">{watchlistHit.reason}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowWatchlistWarning(false); setWatchlistHit(null) }} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel Registration</button>
                {(userRole === 'Admin' || userRole === 'Security') && (
                  <button onClick={() => { setShowWatchlistWarning(false); setWatchlistHit(null); document.querySelector('form')?.requestSubmit() }} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Override & Continue</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Visitor</span>
                <p className="text-sm font-semibold text-gray-900">{selectedAppointment.visitor?.full_name || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Organization</span>
                <p className="text-sm text-gray-900">{selectedAppointment.visitor?.visitor_organization || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Date</span>
                <p className="text-sm text-gray-900">{new Date(selectedAppointment.appointment_date).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Purpose</span>
                <p className="text-sm text-gray-900">{selectedAppointment.purpose || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                <p className="text-sm text-gray-900 capitalize">{selectedAppointment.status.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button onClick={() => setShowDetailsModal(false)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color] || 'bg-gray-50 text-gray-600'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
