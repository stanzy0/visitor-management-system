'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Save, Printer, Download, Mail, Eye, RefreshCw, Shield } from 'lucide-react'
import { getBadges, getBadgeById, reprintBadge, cancelBadge } from '@/lib/client/badges'
import { printBadgeWindow } from '@/lib/badge/badge-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import BadgeLayout from '@/components/BadgeLayout'
import type { VisitorBadge } from '@/lib/badge/badge-types'

export default function AdminBadgesPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [badges, setBadges] = useState<VisitorBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBadge, setSelectedBadge] = useState<VisitorBadge | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchBadges = async () => {
    setLoading(true)
    try {
      const data = await getBadges()
      setBadges(data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load badges' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      fetchBadges()
    }
    checkAuth()
  }, [])

  const handleReprint = async (badgeId: string) => {
    try {
      await reprintBadge(badgeId)
      await printBadgeWindow(badgeId)
      const badge = badges.find(b => b.id === badgeId)
      setNotification({ type: 'success', message: `Badge ${badge?.badge_number} reprinted successfully` })
      fetchBadges()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to reprint badge' })
    }
  }

  const handleCancel = async (badgeId: string) => {
    const reason = prompt('Enter cancellation reason:')
    if (!reason) return

    try {
      await cancelBadge(badgeId)
      setNotification({ type: 'success', message: 'Badge cancelled successfully' })
      fetchBadges()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to cancel badge' })
    }
  }

  const handleDownloadPDF = async (badge: VisitorBadge) => {
    try {
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;background:#ffffff;padding:24px;z-index:-1;'
      document.body.appendChild(container)

      const rootEl = document.createElement('div')
      container.appendChild(rootEl)

      const { createRoot } = await import('react-dom/client')
      const root = createRoot(rootEl)
      root.render(<BadgeLayout badge={badge} />)

      await new Promise<void>(resolve => {
        const raf = requestAnimationFrame(() => {
          setTimeout(resolve, 150)
        })
      })

      const canvas = await html2canvas(rootEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      root.unmount()
      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      pdf.save(`Visitor_Badge_${badge.badge_number}.pdf`)
      setNotification({ type: 'success', message: 'Badge PDF downloaded' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to download PDF' })
    }
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Badge Designer & Printing</h1>
            <p className="text-sm text-gray-500">Design templates, manage printers, and control badge printing</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/badges/templates"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Templates
            </a>
            <a
              href="/admin/badges/printers"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Printers
            </a>
            <a
              href="/admin/badges/history"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-4 w-4" />
              History
            </a>
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search badges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Revoked">Revoked</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Badge Number</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Company</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Printed</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Reprints</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBadges.map((badge) => (
                  <tr key={badge.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{badge.badge_number}</td>
                    <td className="px-4 py-3 text-gray-600">{badge.visit?.visitor?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{badge.visit?.visitor?.visitor_organization || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        badge.badge_status === 'Active' ? 'bg-green-50 text-green-700' :
                        badge.badge_status === 'Expired' ? 'bg-red-50 text-red-700' :
                        badge.badge_status === 'Revoked' ? 'bg-red-50 text-red-700' :
                        badge.badge_status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {badge.badge_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {badge.printed_at ? new Date(badge.printed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{badge.reprint_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBadge(badge)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleReprint(badge.id)}
                          className="p-1 rounded-md hover:bg-gray-100 text-blue-600"
                          title="Reprint"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(badge)}
                          className="p-1 rounded-md hover:bg-gray-100 text-green-600"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {badge.badge_status !== 'Revoked' && badge.badge_status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancel(badge.id)}
                            className="p-1 rounded-md hover:bg-gray-100 text-red-600"
                            title="Revoke/Cancel"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBadges.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No badges found</p>
            </div>
          )}
        </div>
      </div>

      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Badge Preview</h2>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
              <BadgeLayout badge={selectedBadge} />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleReprint(selectedBadge.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Reprint
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedBadge)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
