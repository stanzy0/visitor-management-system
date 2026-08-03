'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { Search, Loader2, CheckCircle, XCircle, LogIn, LogOut, QrCode, Eye, Printer, RefreshCw, X } from 'lucide-react'
import { generateVisitQRCode } from '@/lib/qrcode'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import VisitorBadge from '@/components/VisitorBadge'
import { createBadge } from '@/lib/client/badges'
import { printBadgeWindow } from '@/lib/badge/badge-print'
import type { VisitorBadge as VisitorBadgeType } from '@/lib/badge/badge-types'
import { createHostNotification, createSecurityNotification, createSystemNotification } from '@/lib/notifications'
import NotificationBell from '@/components/notifications/NotificationBell'

type Badge = VisitorBadgeType

interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: { full_name: string; visitor_organization: string; photo_url?: string | null } | null
  employee: { full_name: string } | null
  badge?: Badge | null
}

const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const status = params.get('status')
      if (status && ['pending', 'approved', 'rejected', 'checked_in', 'checked_out'].includes(status)) {
        return status
      }
    }
    return 'all'
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  function setupRealtime() {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('visits-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchVisits()
          } else if (payload.eventType === 'UPDATE') {
            fetchVisits()
          } else if (payload.eventType === 'DELETE') {
            setVisits(prev => prev.filter(v => v.id !== (payload.old as Visit).id))
          }
        }
      )
      .subscribe()
  }

  async function fetchVisits() {
    setLoading(true)

    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      showNotification('error', error.message)
      setLoading(false)
      return
    }

    if (data) {
      const visitIds = data.map(v => v.id)
      let badges: Array<{
        id: string
        visit_id: string
        badge_number: string
        badge_status: string
        qr_token: string
        issued_at: string
        expires_at: string
        printed_at: string | null
        printed_by: string | null
        reprint_count: number
        created_at: string
        updated_at: string
        visit: {
          id: string
          visitor: { full_name: string; visitor_organization: string; photo_url?: string | null } | null
          employee: { full_name: string; department: string } | null
          purpose: string
          check_in_time: string | null
          check_out_time: string | null
        } | null
      }> = []

      if (visitIds.length > 0) {
        const result = await supabase
          .from('visitor_badges')
          .select(`
            id,
            visit_id,
            badge_number,
            badge_status,
            qr_token,
            issued_at,
            expires_at,
            printed_at,
            printed_by,
            reprint_count,
            created_at,
            updated_at,
            visit:visits(
              id,
              visitor:visitors(full_name, visitor_organization, photo_url),
              employee:employees(full_name, department),
              purpose,
              check_in_time,
              check_out_time
            )
          `)
          .in('visit_id', visitIds)

        const rawBadges = result.data || []
        badges = rawBadges.map((b: Record<string, unknown>) => ({
          ...b,
          visit: Array.isArray(b.visit) ? b.visit[0] : b.visit,
        })) as Array<{
          id: string
          visit_id: string
          badge_number: string
          badge_status: string
          qr_token: string
          issued_at: string
          expires_at: string
          printed_at: string | null
          printed_by: string | null
          reprint_count: number
          created_at: string
          updated_at: string
          visit: {
            id: string
            visitor: { full_name: string; visitor_organization: string; photo_url?: string | null } | null
            employee: { full_name: string; department: string } | null
            purpose: string
            check_in_time: string | null
            check_out_time: string | null
          } | null
        }>
      }

      const badgesByVisitId = new Map(badges.map(b => [b.visit_id, b]))
      const visitsWithBadges = data.map(v => ({
        ...v,
        badge: badgesByVisitId.get(v.id) || null,
      }))

      setVisits(visitsWithBadges)
    }
    setLoading(false)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('visits')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchVisits()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const handleStatusChange = async (visitId: string, newStatus: string) => {
    setActionLoading(visitId)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'checked_in') updates.check_in_time = new Date().toISOString()
    if (newStatus === 'checked_out') updates.check_out_time = new Date().toISOString()

    const { data: updatedVisit, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', visitId)
      .select(`
        *,
        visitor:visitors(full_name),
        employee:employees(full_name)
      `)

    if (error) {
      setNotification({ type: 'error', message: error.message })
    } else {
      setNotification({ type: 'success', message: `Visit ${newStatus.replace('_', ' ')} successfully` })
      const visitorName = updatedVisit?.[0]?.visitor?.full_name || 'Unknown Visitor'
      const hostName = updatedVisit?.[0]?.employee?.full_name || 'Unknown Host'
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (updatedVisit && updatedVisit.length > 0) {
        setVisits(prev => prev.map(v => v.id === visitId ? { ...updatedVisit[0], badge: prev.find(p => p.id === visitId)?.badge } : v))
      }

      if (newStatus === 'approved') {
        logAuditAction('Visit Approved', 'visit', visitId, `${visitorName}'s visit to ${hostName} approved`)
        const qrCodeDataUrl = await generateVisitQRCode(visitId)
        await supabase.from('visits').update({ qr_code: qrCodeDataUrl }).eq('id', visitId)
        logAuditAction('QR Code Generated', 'visit', visitId, `QR code generated for visitor ${visitorName}`)
        await handleGenerateBadge(visitId)
        const visit = visits.find(v => v.id === visitId)
        if (visit?.employee?.full_name) {
          const { data: employee } = await supabase.from('employees').select('user_id').eq('full_name', visit.employee.full_name).single()
          if (employee?.user_id) {
            await createHostNotification(employee.user_id, 'Visitor Approved', `${visitorName}'s visit has been approved.`, 'visitor', 'visit', visitId, 'Normal', `/visits?id=${visitId}`)
          }
        }
      } else if (newStatus === 'rejected') {
        logAuditAction('Visit Rejected', 'visit', visitId, `${visitorName}'s visit to ${hostName} rejected`)
        const visit = visits.find(v => v.id === visitId)
        if (visit?.employee?.full_name) {
          const { data: employee } = await supabase.from('employees').select('user_id').eq('full_name', visit.employee.full_name).single()
          if (employee?.user_id) {
            await createHostNotification(employee.user_id, 'Visitor Rejected', `${visitorName}'s visit has been rejected.`, 'visitor', 'visit', visitId, 'High', `/visits?id=${visitId}`)
          }
        }
      } else if (newStatus === 'checked_in') {
        logAuditAction('Visitor Checked In', 'visit', visitId, `${visitorName} checked in at ${currentTime}`)
        const visit = visits.find(v => v.id === visitId)
        if (visit?.employee?.full_name) {
          const { data: employee } = await supabase.from('employees').select('user_id').eq('full_name', visit.employee.full_name).single()
          if (employee?.user_id) {
            await createHostNotification(employee.user_id, 'Visitor Arrived', `${visitorName} has checked in at ${currentTime}.`, 'visitor', 'visit', visitId, 'Normal', `/visits?id=${visitId}`)
          }
        }
      } else if (newStatus === 'checked_out') {
        logAuditAction('Visitor Checked Out', 'visit', visitId, `${visitorName} checked out at ${currentTime}`)
        const visit = visits.find(v => v.id === visitId)
        if (visit?.employee?.full_name) {
          const { data: employee } = await supabase.from('employees').select('user_id').eq('full_name', visit.employee.full_name).single()
          if (employee?.user_id) {
            await createHostNotification(employee.user_id, 'Visitor Checked Out', `${visitorName} has checked out at ${currentTime}.`, 'visitor', 'visit', visitId, 'Normal', `/visits?id=${visitId}`)
          }
        }
      }

      fetchVisits()
    }
    setActionLoading(null)
  }

  const handleGenerateBadge = async (visitId: string) => {
    try {
      const visit = visits.find(v => v.id === visitId)
      if (visit?.badge?.id) {
        showNotification('error', 'This visit already has a badge.')
        return
      }

      const badge = await createBadge(visitId, 24)
      const visitName = visit?.visitor?.full_name || 'visitor'
      await logAuditAction('Badge Generated', 'badge', badge.id, `Badge ${badge.badge_number} generated for ${visitName}`)
      showNotification('success', `Badge ${badge.badge_number} generated successfully`)
      fetchVisits()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to generate badge')
    }
  }

  const handlePrintBadge = async (badgeId: string) => {
    try {
      await printBadgeWindow(badgeId)
      showNotification('success', 'Badge printed successfully')
      fetchVisits()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to print badge')
    }
  }

  const handleReprintBadge = async (badgeId: string) => {
    try {
      const { reprintBadge } = await import('@/lib/client/badges')
      await reprintBadge(badgeId)
      await printBadgeWindow(badgeId)
      showNotification('success', 'Badge reprinted successfully')
      fetchVisits()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to reprint badge')
    }
  }

  const handleCancelBadge = async (badgeId: string) => {
    try {
      const { cancelBadge } = await import('@/lib/client/badges')
      await cancelBadge(badgeId)
      showNotification('success', 'Badge cancelled successfully')
      fetchVisits()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to cancel badge')
    }
  }

  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    checked_in: 'bg-green-50 text-green-700 border-green-200',
    checked_out: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      (v.visitor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.visitor?.visitor_organization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
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
          <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search visits..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked out</option>
            </select>
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{notification.message}</div>
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor Organization</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host Employee</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {visit.visitor?.photo_url ? (
                            <img
                              src={visit.visitor.photo_url}
                              alt={visit.visitor?.full_name || ''}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">
                                 {(visit.visitor?.full_name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{visit.visitor?.visitor_organization || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit ${statusStyles[visit.status]}`}>
                             {(visit.status || 'unknown').replace('_', ' ')}
                          </span>
                          {visit.badge && (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit ${
                              visit.badge.badge_status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                              visit.badge.badge_status === 'Expired' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              Badge: {visit.badge.badge_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {visit.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(visit.id, 'approved')}
                                disabled={actionLoading === visit.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusChange(visit.id, 'rejected')}
                                disabled={actionLoading === visit.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                Reject
                              </button>
                            </>
                          )}
                          {visit.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(visit.id, 'checked_in')}
                                disabled={actionLoading === visit.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                                Check In
                              </button>
                              {!visit.badge && (
                                <button
                                  onClick={() => handleGenerateBadge(visit.id)}
                                  disabled={actionLoading === visit.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                                >
                                  {actionLoading === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                                  Generate Badge
                                </button>
                              )}
                            </>
                          )}
                          {visit.status === 'checked_in' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(visit.id, 'checked_out')}
                                disabled={actionLoading === visit.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                              >
                                {actionLoading === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                                Check Out
                              </button>
                            </>
                          )}
                          {visit.badge && (
                            <>
                              <button
                                onClick={() => setSelectedBadge(visit.badge!)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-medium hover:bg-blue-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Badge
                              </button>
                              <button
                                onClick={() => {
                                  if (!visit.badge?.id) {
                                    showNotification('error', 'Badge information is missing.')
                                    return
                                  }
                                  handlePrintBadge(visit.badge.id)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-xs font-medium hover:bg-green-100"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                              </button>
                              <button
                                onClick={() => {
                                  if (!visit.badge?.id) {
                                    showNotification('error', 'Badge information is missing.')
                                    return
                                  }
                                  handleReprintBadge(visit.badge.id)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reprint
                              </button>
                              <button
                                onClick={() => {
                                  if (!visit.badge?.id) {
                                    showNotification('error', 'Badge information is missing.')
                                    return
                                  }
                                  handleCancelBadge(visit.badge.id)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredVisits.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No visits found</p>
            </div>
          )}
        </div>
      </div>

      {selectedBadge && (
        <VisitorBadge
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
          onPrint={() => handlePrintBadge(selectedBadge.id)}
        />
      )}
    </div>
  )
}
