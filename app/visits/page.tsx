'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Loader2, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react'
import { generateVisitQRCode } from '@/lib/qrcode'

interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: { full_name: string; company: string; photo_url?: string | null } | null
  employee: { full_name: string } | null
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      fetchVisits()
    }
    checkAuth()
  }, [])

  const fetchVisits = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visitor:visitors(full_name, company, photo_url),
        employee:employees(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      showNotification('error', error.message)
    } else {
      setVisits(data || [])
    }
    setLoading(false)
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleStatusChange = async (visitId: string, newStatus: string) => {
    console.log('Visit ID:', visitId)
    console.log('New Status:', newStatus)

    setActionLoading(visitId)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'checked_in') updates.check_in_time = new Date().toISOString()
    if (newStatus === 'checked_out') updates.check_out_time = new Date().toISOString()

    console.log('Updates:', updates)

    const { data: updatedVisit, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', visitId)
      .select(`
        *,
        visitor:visitors(full_name),
        employee:employees(full_name)
      `)

    console.log('Returned Data:', updatedVisit)
    console.log('Supabase Error:', error)

    if (error) {
      console.error('Visit Update Error:', error)
      setNotification({
        type: 'error',
        message: error.message
      })
      setActionLoading(null)
      return
    }

    setNotification({
      type: 'success',
      message: `Visit ${newStatus.replace('_', ' ')} successfully`
    })

    // Log audit action
    const visitorName = updatedVisit?.[0]?.visitor?.full_name || 'Unknown Visitor'
    const hostName = updatedVisit?.[0]?.employee?.full_name || 'Unknown Host'
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (newStatus === 'approved') {
      logAuditAction('Visit Approved', 'visit', visitId, `${visitorName}'s visit to ${hostName} approved`)
      const qrCodeDataUrl = await generateVisitQRCode(visitId)
      await supabase
        .from('visits')
        .update({ qr_code: qrCodeDataUrl })
        .eq('id', visitId)
      logAuditAction('QR Code Generated', 'visit', visitId, `QR code generated for visitor ${visitorName}`)
    } else if (newStatus === 'rejected') {
      logAuditAction('Visit Rejected', 'visit', visitId, `${visitorName}'s visit to ${hostName} rejected`)
    } else if (newStatus === 'checked_in') {
      logAuditAction('Visitor Checked In', 'visit', visitId, `${visitorName} checked in at ${currentTime}`)
    } else if (newStatus === 'checked_out') {
      logAuditAction('Visitor Checked Out', 'visit', visitId, `${visitorName} checked out at ${currentTime}`)
    }

    fetchVisits()
    setActionLoading(null)
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
      (v.visitor?.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search visits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
            </select>
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Company</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host Employee</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-32">Actions</th>
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
                              {(visit.visitor?.full_name || '').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{visit.visitor?.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[visit.status]}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {visit.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(visit.id, 'approved')}
                              disabled={actionLoading === visit.id}
                              className="p-1 rounded-md hover:bg-green-50 transition-colors"
                              title="Approve"
                            >
                              {actionLoading === visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                            </button>
                            <button
                              onClick={() => handleStatusChange(visit.id, 'rejected')}
                              disabled={actionLoading === visit.id}
                              className="p-1 rounded-md hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              {actionLoading === visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-red-600" />}
                            </button>
                          </>
                        )}
                        {visit.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(visit.id, 'checked_in')}
                            disabled={actionLoading === visit.id}
                            className="p-1 rounded-md hover:bg-blue-50 transition-colors"
                            title="Check In"
                          >
                            {actionLoading === visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4 text-blue-600" />}
                          </button>
                        )}
                        {visit.status === 'checked_in' && (
                          <button
                            onClick={() => handleStatusChange(visit.id, 'checked_out')}
                            disabled={actionLoading === visit.id}
                            className="p-1 rounded-md hover:bg-purple-50 transition-colors"
                            title="Check Out"
                          >
                            {actionLoading === visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 text-purple-600" />}
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

          {!loading && filteredVisits.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No visits found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}