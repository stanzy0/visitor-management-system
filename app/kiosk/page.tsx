'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { Users, QrCode, Scan, LogIn, LogOut, Printer, Calendar, Clock, UserCheck, Search, Loader2 } from 'lucide-react'
import { generateVisitQRCode } from '@/lib/qrcode'
import { logAuditAction } from '@/lib/audit'

interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null } | null
  employee: { full_name: string; department: string; office_location: string } | null
}

interface Appointment {
  id: string
  visitor_id: string
  employee_id: string
  appointment_date: string
  expected_arrival: string | null
  purpose: string
  status: string
  visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null } | null
  employee: { full_name: string; department: string } | null
}

interface Stats {
  visitorsToday: number
  currentlyOnSite: number
  upcomingAppointments: number
  pendingApprovals: number
}

export default function KioskPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [stats, setStats] = useState<Stats>({
    visitorsToday: 0,
    currentlyOnSite: 0,
    upcomingAppointments: 0,
    pendingApprovals: 0,
  })
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [kioskLocked, setKioskLocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Visit[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    if (!kioskLocked) {
      inactivityTimer.current = setTimeout(() => {
        setKioskLocked(true)
      }, INACTIVITY_TIMEOUT)
    }
  }, [kioskLocked])

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (user.role !== 'Admin' && user.role !== 'Receptionist') {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      setAuthChecking(false)
      fetchStats()
      fetchRecentVisits()
      fetchUpcomingAppointments()
      setupRealtime()
      resetInactivityTimer()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [resetInactivityTimer])

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    const [visitorsTodayRes, onSiteRes, upcomingApptRes, pendingRes] = await Promise.all([
      supabase.from('visits').select('id', { count: 'exact' }).gte('created_at', today),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'checked_in'),
      supabase.from('appointments').select('id', { count: 'exact' }).gte('appointment_date', today).in('status', ['Scheduled', 'Approved']),
      supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'pending'),
    ])

    setStats({
      visitorsToday: visitorsTodayRes.count ?? 0,
      currentlyOnSite: onSiteRes.count ?? 0,
      upcomingAppointments: upcomingApptRes.count ?? 0,
      pendingApprovals: pendingRes.count ?? 0,
    })
  }, [])

  const fetchRecentVisits = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error) {
      setRecentVisits(data || [])
    }
    setLoading(false)
  }, [])

  const fetchUpcomingAppointments = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department)
      `)
      .gte('appointment_date', today)
      .in('status', ['Scheduled', 'Approved'])
      .order('appointment_date', { ascending: true })
      .order('expected_arrival', { ascending: true })

    if (!error) {
      setUpcomingAppointments(data || [])
    }
  }, [])

  const setupRealtime = useCallback(() => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('kiosk-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        setTimeout(() => {
          fetchStats()
          fetchRecentVisits()
        }, 100)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        setTimeout(() => {
          fetchStats()
          fetchUpcomingAppointments()
        }, 250)
      })
      .subscribe()
  }, [fetchStats, fetchRecentVisits, fetchUpcomingAppointments])

  useEffect(() => {
    const handleActivity = () => resetInactivityTimer()
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('keydown', handleActivity)

    return () => {
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [resetInactivityTimer])

  const handlePinSubmit = () => {
    if (pinInput === '1234') {
      setKioskLocked(false)
      setPinInput('')
      setPinError(false)
      resetInactivityTimer()
    } else {
      setPinError(true)
      setPinInput('')
      setTimeout(() => setPinError(false), 2000)
    }
  }

  const handleCheckIn = async (visitId: string) => {
    setActionLoading(visitId)
    const { error } = await supabase
      .from('visits')
      .update({ status: 'checked_in', check_in_time: new Date().toISOString() })
      .eq('id', visitId)

    if (error) {
      showNotification('error', error.message)
    } else {
      setRecentVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'checked_in', check_in_time: new Date().toISOString() } : v))
      fetchStats()
      showNotification('success', 'Visitor checked in')
    }
    setActionLoading(null)
  }

  const handleCheckOut = async (visitId: string) => {
    setActionLoading(visitId)
    const { error } = await supabase
      .from('visits')
      .update({ status: 'checked_out', check_out_time: new Date().toISOString() })
      .eq('id', visitId)

    if (error) {
      showNotification('error', error.message)
    } else {
      setRecentVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'checked_out', check_out_time: new Date().toISOString() } : v))
      fetchStats()
      showNotification('success', 'Visitor checked out')
    }
    setActionLoading(null)
  }

  const handlePrintBadge = async (visit: Visit) => {
    setActionLoading(visit.id)
    try {
      const qrCode = await generateVisitQRCode(visit.id)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Print Badge</title></head>
            <body style="margin:0;padding:20px;font-family:sans-serif;">
              <div style="width:300px;padding:20px;border:2px solid #000;">
                <h2 style="text-align:center;margin:0 0 10px 0;font-size:24px;">VISITOR PASS</h2>
                <img src="${visit.visitor?.photo_url || ''}" alt="photo" style="width:80px;height:80px;object-fit:cover;display:block;margin:0 auto 10px;" />
                <p style="text-align:center;font-size:18px;font-weight:bold;margin:5px 0;">${visit.visitor?.full_name || ''}</p>
                <p style="text-align:center;margin:5px 0;">${visit.visitor?.visitor_organization || ''}</p>
                <p style="margin:5px 0;"><strong>Host:</strong> ${visit.employee?.full_name || ''}</p>
                <p style="margin:5px 0;"><strong>Dept:</strong> ${visit.employee?.department || ''}</p>
                <img src="${qrCode}" alt="QR" style="width:100px;height:100px;margin:10px auto;display:block;" />
                <p style="text-align:center;font-size:12px;">#${visit.id.slice(0, 8)}</p>
              </div>
              <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
          </html>
        `)
        printWindow.document.close()
        logAuditAction('Badge Printed', 'visit', visit.id, `Badge printed for ${visit.visitor?.full_name}`)
      }
    } catch (err) {
      showNotification('error', 'Failed to generate badge')
    }
    setActionLoading(null)
  }

  const handleSearch = async () => {
    if (!searchTerm) return
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location)
      `)
      .or(`visitor.full_name.ilike.%${searchTerm}%,visitor_organization.ilike.%${searchTerm}%,appointment_date.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error) {
      setSearchResults(data || [])
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    rejected: 'bg-red-50 text-red-700',
    checked_in: 'bg-green-50 text-green-700',
    checked_out: 'bg-gray-50 text-gray-700',
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (kioskLocked) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Kiosk Locked</h2>
          <p className="text-gray-600 mb-6 text-center">Enter PIN to unlock</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            className="w-full text-center text-3xl tracking-widest px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none mb-4"
            maxLength={4}
            placeholder="••••"
          />
          <button
            onClick={handlePinSubmit}
            className="w-full py-3 text-lg font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Unlock
          </button>
          {pinError && (
            <p className="text-red-600 text-center mt-4">Invalid PIN</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={resetInactivityTimer} onTouchStart={resetInactivityTimer}>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reception Kiosk</h1>
          <div className="text-sm text-gray-500">Welcome, {userRole}</div>
        </div>
      </header>

      {notification && (
        <div className={`mx-6 mt-4 rounded-lg p-3 text-center text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.visitorsToday}</p>
            <p className="text-sm text-gray-600">Visitors Today</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <UserCheck className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.currentlyOnSite}</p>
            <p className="text-sm text-gray-600">On Site</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Calendar className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
            <p className="text-sm text-gray-600">Upcoming</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/visitors" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 flex flex-col items-center justify-center transition-colors min-h-[120px]">
            <Users className="h-12 w-12 mb-3" />
            <span className="text-lg font-semibold">Register Visitor</span>
          </a>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Appointment Lookup</span>
            </div>
            <input
              type="text"
              placeholder="Name, Org, Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base mb-2"
            />
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto mt-2 space-y-2">
                {searchResults.map(visit => (
                  <div key={visit.id} className="text-sm p-2 bg-gray-50 rounded">
                    <p className="font-medium">{visit.visitor?.full_name}</p>
                    <p className="text-gray-600">{visit.employee?.full_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a href="/scanner" className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-6 flex flex-col items-center justify-center transition-colors min-h-[120px]">
            <Scan className="h-12 w-12 mb-3" />
            <span className="text-lg font-semibold">QR Scanner</span>
          </a>

          <button
            onClick={() => setKioskLocked(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center transition-colors min-h-[120px]"
          >
            <LogOut className="h-12 w-12 mb-3" />
            <span className="text-lg font-semibold">Lock Kiosk</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Recent Visitors
            </h2>
            <div className="bg-white rounded-xl border border-gray-200">
              {loading ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : recentVisits.length === 0 ? (
                <p className="p-6 text-center text-gray-500">No recent visitors</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentVisits.map(visit => (
                    <div key={visit.id} className="p-4 flex items-center gap-3">
                      {visit.visitor?.photo_url ? (
                        <img src={visit.visitor.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-500">
                            {(visit.visitor?.full_name || '').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{visit.visitor?.full_name || '—'}</p>
                        <p className="text-sm text-gray-600">{visit.employee?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">{visit.employee?.department || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[visit.status] || ''}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                      <div className="flex gap-1">
                        {visit.status === 'approved' && (
                          <button
                            onClick={() => handleCheckIn(visit.id)}
                            disabled={actionLoading === visit.id}
                            className="p-2 rounded hover:bg-blue-50"
                            title="Check In"
                          >
                            <LogIn className="h-4 w-4 text-blue-600" />
                          </button>
                        )}
                        {visit.status === 'checked_in' && (
                          <button
                            onClick={() => handleCheckOut(visit.id)}
                            disabled={actionLoading === visit.id}
                            className="p-2 rounded hover:bg-purple-50"
                            title="Check Out"
                          >
                            <LogOut className="h-4 w-4 text-purple-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintBadge(visit)}
                          disabled={actionLoading === visit.id}
                          className="p-2 rounded hover:bg-gray-100"
                          title="Print Badge"
                        >
                          <Printer className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Upcoming Appointments
            </h2>
            <div className="bg-white rounded-xl border border-gray-200">
              {upcomingAppointments.length === 0 ? (
                <p className="p-6 text-center text-gray-500">No upcoming appointments</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {upcomingAppointments.map(appt => (
                    <div key={appt.id} className="p-4 flex items-center gap-3">
                      {appt.visitor?.photo_url ? (
                        <img src={appt.visitor.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-500">
                            {(appt.visitor?.full_name || '').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{appt.visitor?.full_name || '—'}</p>
                        <p className="text-sm text-gray-600">{appt.employee?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">{appt.appointment_date} {appt.expected_arrival}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}