'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import {
  Search,
  Loader2,
  Printer,
  Eye,
  RefreshCw,
  Download,
  Filter,
  QrCode,
} from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import VisitorBadge from '@/components/VisitorBadge'
import { VisitorBadge as VisitorBadgeType, getBadgeByVisitId, printBadge, reprintBadge, cancelBadge } from '@/lib/badges'
import jsPDF from 'jspdf'

interface Visit {
  id: string
  purpose: string
  status: string
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: { full_name: string; visitor_organization: string; photo_url?: string | null } | null
  employee: { full_name: string; department?: string } | null
  badge?: VisitorBadgeType | null
}

const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function BadgesPage() {
  const [badges, setBadges] = useState<VisitorBadgeType[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBadge, setSelectedBadge] = useState<VisitorBadgeType | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('badges')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchBadges()
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

  const fetchBadges = async () => {
    setLoading(true)
    let query = supabase
      .from('visitor_badges')
      .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department))')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      showNotification('error', error.message)
    } else {
      setBadges(data || [])
    }
    setLoading(false)
  }

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('visits')
      .select('*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department)')
      .in('status', ['approved', 'checked_in', 'checked_out'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setVisits(data)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('badges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_badges' }, () => {
        fetchBadges()
      })
      .subscribe()
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleGenerateBadge = async (visitId: string) => {
    try {
      const { createBadge } = await import('@/lib/badges')
      const badge = await createBadge(visitId, 24)
      const visitorName = visits.find(v => v.id === visitId)?.visitor?.full_name || 'Visitor'
      await logAuditAction('Badge Generated', 'badge', badge.id, `Badge ${badge.badge_number} generated for ${visitorName}`)
      showNotification('success', `Badge ${badge.badge_number} generated successfully`)
      fetchBadges()
      fetchVisits()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to generate badge')
    }
  }

  const handleReprint = async (badgeId: string) => {
    try {
      await reprintBadge(badgeId)
      const badge = badges.find(b => b.id === badgeId)
      await logAuditAction('Badge Reprinted', 'badge', badgeId, `Badge ${badge?.badge_number} reprinted`)
      showNotification('success', 'Badge reprinted successfully')
      fetchBadges()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to reprint badge')
    }
  }

  const handleCancel = async (badgeId: string) => {
    try {
      await cancelBadge(badgeId)
      const badge = badges.find(b => b.id === badgeId)
      await logAuditAction('Badge Cancelled', 'badge', badgeId, `Badge ${badge?.badge_number} cancelled`)
      showNotification('success', 'Badge cancelled successfully')
      fetchBadges()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to cancel badge')
    }
  }

  const handleDownloadPDF = async (badge: VisitorBadgeType) => {
    try {
      const pdf = new jsPDF()
      pdf.setFontSize(20)
      pdf.setTextColor(37, 99, 235)
      pdf.text('VISITOR BADGE', 105, 20, { align: 'center' })

      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, 25, 190, 25)

      pdf.setFontSize(12)
      pdf.setTextColor(60, 60, 60)
      pdf.text(`Badge Number: ${badge.badge_number}`, 20, 35)
      pdf.text(`Status: ${badge.badge_status}`, 20, 42)
      pdf.text(`Issued: ${new Date(badge.issued_at).toLocaleString()}`, 20, 49)
      pdf.text(`Expires: ${new Date(badge.expires_at).toLocaleString()}`, 20, 56)

      if (badge.visit) {
        pdf.text(`Visitor: ${badge.visit.visitor?.full_name || '—'}`, 20, 66)
        pdf.text(`Organization: ${badge.visit.visitor?.visitor_organization || '—'}`, 20, 73)
        pdf.text(`Host: ${badge.visit.employee?.full_name || '—'}`, 20, 80)
        pdf.text(`Purpose: ${badge.visit.purpose || '—'}`, 20, 87)
      }

      const qrData = JSON.stringify({
        visitId: badge.visit_id,
        qrToken: badge.badge_number,
        type: 'visitor-pass',
      })

      const QRCodeToDataURL = (await import('qrcode')).default
      const qrDataUrl = await QRCodeToDataURL(qrData, { width: 120, margin: 1 })
      pdf.addImage(qrDataUrl, 'PNG', 140, 60, 50, 50)

      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text('Scan for check-in/out and verification', 165, 115, { align: 'center' })

      pdf.save(`badge-${badge.badge_number}.pdf`)
      showNotification('success', 'Badge PDF downloaded')
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to download PDF')
    }
  }

  const handlePrint = async (badgeId: string) => {
    await printBadge(badgeId)
    const badge = badges.find(b => b.id === badgeId)
    await logAuditAction('Badge Printed', 'badge', badgeId, `Badge ${badge?.badge_number} printed`)
    window.print()
    fetchBadges()
  }

  const filteredBadges = badges.filter(badge => {
    const matchesSearch =
      badge.badge_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.qr_token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.visit?.visitor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.visit?.visitor?.visitor_organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.visit?.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || badge.badge_status === statusFilter
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
          <h1 className="text-2xl font-bold text-gray-900">Badge Management</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search badge number, visitor, host, QR token..."
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
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              onClick={fetchBadges}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-sm text-gray-500">Active Badges</p>
            <p className="text-2xl font-bold text-green-600">{badges.filter(b => b.badge_status === 'Active').length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-sm text-gray-500">Expired Badges</p>
            <p className="text-2xl font-bold text-red-600">{badges.filter(b => b.badge_status === 'Expired').length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-sm text-gray-500">Checked Out</p>
            <p className="text-2xl font-bold text-gray-600">{badges.filter(b => b.badge_status === 'Checked Out').length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-sm text-gray-500">Reprints</p>
            <p className="text-2xl font-bold text-blue-600">{badges.reduce((sum, b) => sum + (b.reprint_count || 0), 0)}</p>
          </div>
        </div>

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
                    <th className="px-4 py-3 font-semibold text-gray-700">Badge #</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Issued</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Expires</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBadges.map((badge) => (
                    <tr key={badge.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-gray-900">{badge.badge_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {badge.visit?.visitor?.photo_url ? (
                            <img
                              src={badge.visit.visitor.photo_url}
                              alt={badge.visit.visitor.full_name || ''}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">
                                {(badge.visit?.visitor?.full_name || 'V').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-xs">
                              {badge.visit?.visitor?.full_name || '—'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {badge.visit?.visitor?.visitor_organization || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {badge.visit?.employee?.full_name || '—'}
                        {badge.visit?.employee?.department && <span className="block text-gray-400">{badge.visit.employee.department}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          badge.badge_status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                          badge.badge_status === 'Expired' ? 'bg-red-50 text-red-700 border-red-200' :
                          badge.badge_status === 'Checked Out' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {badge.badge_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {badge.issued_at ? new Date(badge.issued_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {badge.expires_at ? new Date(badge.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedBadge(badge)}
                            disabled={!badge.visit}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handlePrint(badge.id)}
                            disabled={!badge.visit}
                            className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-xs font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </button>
                          {badge.badge_status !== 'Cancelled' && badge.badge_status !== 'Expired' && (
                            <button
                              onClick={() => handleReprint(badge.id)}
                              disabled={badge.reprint_count >= 5}
                              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Reprint
                            </button>
                          )}
                          {badge.badge_status === 'Active' && (
                            <button
                              onClick={() => handleCancel(badge.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100"
                            >
                              Cancel
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

          {!loading && filteredBadges.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No badges found</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Badge for Visit</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {visit.visitor?.photo_url ? (
                          <img
                            src={visit.visitor.photo_url}
                            alt={visit.visitor.full_name || ''}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">
                              {(visit.visitor?.full_name || 'V').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{visit.visitor?.full_name || '—'}</p>
                          <p className="text-xs text-gray-500">{visit.visitor?.visitor_organization || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{visit.employee?.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        visit.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        visit.status === 'checked_in' ? 'bg-green-50 text-green-700 border-green-200' :
                        visit.status === 'checked_out' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!visit.badge && ['approved', 'checked_in', 'checked_out'].includes(visit.status) && (
                        <button
                          onClick={() => handleGenerateBadge(visit.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Generate Badge
                        </button>
                      )}
                      {visit.badge && (
                        <span className="text-xs text-gray-500">Badge: {visit.badge.badge_number}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedBadge && (
          <VisitorBadge
            badge={{
              ...selectedBadge,
              visit: selectedBadge.visit as any,
            }}
            onClose={() => setSelectedBadge(null)}
            onPrint={() => handlePrint(selectedBadge.id)}
            onDownload={() => handleDownloadPDF(selectedBadge)}
            onReprint={() => handleReprint(selectedBadge.id)}
          />
        )}
      </div>
    </div>
  )
}
