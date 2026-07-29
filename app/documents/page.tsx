'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth-client'
import { getAuthHeaders } from '@/lib/client/api'
import { logAuditAction } from '@/lib/client/audit'
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  RotateCcw,
  Filter,
  X,
} from 'lucide-react'
import type { DocumentVerification, DocumentVerificationFilters, DocumentVerificationStats } from '@/lib/types/document-verification'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  Pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  Approved: { label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  Rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  'Replacement Requested': { label: 'Replacement Requested', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  Reuploaded: { label: 'Reuploaded', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: RotateCcw },
}

export default function DocumentsPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [verifications, setVerifications] = useState<DocumentVerification[]>([])
  const [stats, setStats] = useState<DocumentVerificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DocumentVerificationFilters>({
    search: '',
    document_type: '',
    status: 'all',
    date_from: '',
    date_to: '',
  })
  const [selectedDoc, setSelectedDoc] = useState<DocumentVerification | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const canApprove = userRole === 'Admin' || userRole === 'Receptionist'
  const canReject = userRole === 'Admin' || userRole === 'Receptionist'
  const canRequestReplacement = userRole === 'Admin' || userRole === 'Receptionist'
  const canView = true

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!authChecking) {
      fetchVerifications()
      fetchStats()
    }
  }, [filters, authChecking])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setUserRole(user.role)
    setAuthChecking(false)
  }

  const fetchVerifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.document_type) params.set('document_type', filters.document_type)
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)

      const res = await fetch(`/api/documents?${params.toString()}`, {
        headers: await getAuthHeaders(),
      })
      const json = await res.json()
      if (res.ok) {
        setVerifications(json.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch verifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/documents/stats', {
        headers: await getAuthHeaders(),
      })
      const json = await res.json()
      if (res.ok) {
        setStats(json.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/documents/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      if (res.ok) {
        showNotification('success', 'Document approved successfully')
        fetchVerifications()
        fetchStats()
        setSelectedDoc(null)
      } else {
        showNotification('error', json.error || 'Failed to approve document')
      }
    } catch {
      showNotification('error', 'Failed to approve document')
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/documents/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reject', reason }),
      })
      const json = await res.json()
      if (res.ok) {
        showNotification('success', 'Document rejected')
        fetchVerifications()
        fetchStats()
        setSelectedDoc(null)
      } else {
        showNotification('error', json.error || 'Failed to reject document')
      }
    } catch {
      showNotification('error', 'Failed to reject document')
    }
  }

  const handleRequestReplacement = async (id: string, reason: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/documents/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'replacement', reason }),
      })
      const json = await res.json()
      if (res.ok) {
        showNotification('success', 'Replacement requested')
        fetchVerifications()
        fetchStats()
        setSelectedDoc(null)
      } else {
        showNotification('error', json.error || 'Failed to request replacement')
      }
    } catch {
      showNotification('error', 'Failed to request replacement')
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/documents/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      if (res.ok && json.url) {
        const a = document.createElement('a')
        a.href = json.url
        a.download = json.file_name || 'document'
        a.click()
        showNotification('success', 'Download started')
      } else {
        showNotification('error', json.error || 'Failed to download document')
      }
    } catch {
      showNotification('error', 'Failed to download document')
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const updateFilter = (key: keyof DocumentVerificationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
          <h1 className="text-2xl font-bold text-gray-900">Document Verification Center</h1>
          <button
            onClick={fetchVerifications}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {notification && (
          <div
            className={`rounded-lg p-4 text-sm ${
              notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Pending" value={stats.pending.toString()} icon={Clock} color="amber" />
            <StatCard title="Approved" value={stats.approved.toString()} icon={CheckCircle} color="green" />
            <StatCard title="Rejected" value={stats.rejected.toString()} icon={XCircle} color="red" />
            <StatCard title="Replacement Requested" value={stats.replacement_requested.toString()} icon={AlertTriangle} color="orange" />
            <StatCard title="Reuploaded" value={stats.reuploaded.toString()} icon={RotateCcw} color="blue" />
            <StatCard title="Today's Reviews" value={stats.today_reviews.toString()} icon={FileText} color="purple" />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by visitor name, document type, registration number..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={filters.document_type}
                  onChange={(e) => updateFilter('document_type', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Document Types</option>
                  <option value="National Identity Card">National Identity Card</option>
                  <option value="International Passport">International Passport</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="Military Identity Card">Military Identity Card</option>
                  <option value="Staff Identity Card">Staff Identity Card</option>
                  <option value="Invitation Letter">Invitation Letter</option>
                  <option value="Approval Letter">Approval Letter</option>
                  <option value="Vehicle Permit">Vehicle Permit</option>
                  <option value="Security Clearance">Security Clearance</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Replacement Requested">Replacement Requested</option>
                  <option value="Reuploaded">Reuploaded</option>
                </select>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => updateFilter('date_from', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Date from"
                />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => updateFilter('date_to', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Date to"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : verifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No document verifications found</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Document Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-48">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {verifications.map((verification) => {
                    const statusConfig = STATUS_CONFIG[verification.status] || STATUS_CONFIG.Pending
                    const StatusIcon = statusConfig.icon
                    return (
                      <tr key={verification.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium text-gray-900">{verification.visitor?.full_name || '—'}</span>
                            <span className="text-xs text-gray-500 block">{verification.visitor?.email || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{verification.document_type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {verification.visit?.employee?.full_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(verification.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDoc(verification)}
                              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </button>
                            {verification.status === 'Pending' && canApprove && (
                              <button
                                onClick={() => handleApprove(verification.id)}
                                className="p-1 rounded-md hover:bg-green-50 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            {verification.status === 'Pending' && canReject && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Rejection reason:')
                                  if (reason) handleReject(verification.id, reason)
                                }}
                                className="p-1 rounded-md hover:bg-red-50 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                            {verification.status === 'Pending' && canRequestReplacement && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Replacement reason:')
                                  if (reason) handleRequestReplacement(verification.id, reason)
                                }}
                                className="p-1 rounded-md hover:bg-orange-50 transition-colors"
                                title="Request Replacement"
                              >
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(verification.id)}
                              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestReplacement={handleRequestReplacement}
          onDownload={handleDownload}
          canApprove={canApprove}
          canReject={canReject}
          canRequestReplacement={canRequestReplacement}
        />
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof Clock; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.amber}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DocumentDetailModal({
  document,
  onClose,
  onApprove,
  onReject,
  onRequestReplacement,
  onDownload,
  canApprove,
  canReject,
  canRequestReplacement,
}: {
  document: DocumentVerification
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  onRequestReplacement: (id: string, reason: string) => void
  onDownload: (id: string) => void
  canApprove: boolean
  canReject: boolean
  canRequestReplacement: boolean
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [replacementReason, setReplacementReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showReplacementForm, setShowReplacementForm] = useState(false)
  const [imageError, setImageError] = useState(false)

  const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.Pending
  const StatusIcon = statusConfig.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Document Verification</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Visitor Information</h3>
                <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Name</span>
                    <p className="text-sm font-semibold text-gray-900">{document.visitor?.full_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Email</span>
                    <p className="text-sm text-gray-700">{document.visitor?.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Organization</span>
                    <p className="text-sm text-gray-700">{document.visitor?.visitor_organization || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Visit Information</h3>
                <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Visit ID</span>
                    <p className="text-sm text-gray-700">{document.visit_id || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                    <p className="text-sm text-gray-700 capitalize">{document.visit?.status?.replace('_', ' ') || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Host</span>
                    <p className="text-sm text-gray-700">{document.visit?.employee?.full_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Department</span>
                    <p className="text-sm text-gray-700">{document.visit?.employee?.department || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Document Details</h3>
                <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Type</span>
                    <p className="text-sm text-gray-700">{document.document_type}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Uploaded</span>
                    <p className="text-sm text-gray-700">{new Date(document.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {document.status === 'Rejected' && document.rejected_reason && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Rejection Reason</h3>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{document.rejected_reason}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {document.status === 'Pending' && canApprove && (
                    <button
                      onClick={() => onApprove(document.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                  )}
                  {document.status === 'Pending' && canReject && (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  )}
                  {document.status === 'Pending' && canRequestReplacement && (
                    <button
                      onClick={() => setShowReplacementForm(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Request Replacement
                    </button>
                  )}
                  <button
                    onClick={() => onDownload(document.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Document Preview</h3>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {document.document_url && !imageError ? (
                  <div className="space-y-3">
                    <img
                      src={document.document_url}
                      alt={document.document_type}
                      className="w-full max-h-96 object-contain rounded-lg"
                      onError={() => setImageError(true)}
                    />
                    <div className="flex items-center gap-2">
                      <a
                        href={document.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3" />
                        Open in New Tab
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mb-3 text-gray-300" />
                    <p>Preview not available</p>
                    <a
                      href={document.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" />
                      Download to View
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showRejectForm && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (rejectReason.trim()) {
                      onReject(document.id, rejectReason)
                      setShowRejectForm(false)
                      setRejectReason('')
                    }
                  }}
                  disabled={!rejectReason.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showReplacementForm && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Replacement Reason</label>
              <textarea
                value={replacementReason}
                onChange={(e) => setReplacementReason(e.target.value)}
                placeholder="Enter reason for replacement..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (replacementReason.trim()) {
                      onRequestReplacement(document.id, replacementReason)
                      setShowReplacementForm(false)
                      setReplacementReason('')
                    }
                  }}
                  disabled={!replacementReason.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Confirm Request
                </button>
                <button
                  onClick={() => setShowReplacementForm(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
