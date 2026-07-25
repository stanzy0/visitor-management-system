'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { logAuditAction } from '@/lib/client/audit'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react'
import { useDocuments, useVisitorDocuments } from '@/hooks/useDocuments'
import {
  VisitorDocument,
  DocumentType,
  VerificationStatus,
  DOCUMENT_TYPES,
  VERIFICATION_STATUSES,
  getVerificationStatusColor,
} from '@/lib/types/document'
import { formatFileSize } from '@/lib/types/document'
import DocumentUpload from '@/components/documents/DocumentUpload'
import DocumentPreview from '@/components/documents/DocumentPreview'
import DocumentVerificationModal from '@/components/documents/DocumentVerificationModal'

const STATUS_COLORS: Record<VerificationStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Verified: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function DocumentsPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('')
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | ''>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const status = params.get('verification_status')
      if (status && ['Pending', 'Verified', 'Rejected'].includes(status)) {
        return status as VerificationStatus
      }
    }
    return ''
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<VisitorDocument | null>(null)
  const [verifyDoc, setVerifyDoc] = useState<VisitorDocument | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedVisitorId] = useState<string>('')
  const [clientDateFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const date = params.get('date')
      if (date === 'today') {
        return 'today'
      }
    }
    return ''
  })

  const { documents, loading, error, total, refetch, create, update, remove, verify, reject } = useDocuments({
    search: searchTerm || undefined,
    document_type: typeFilter || undefined,
    verification_status: statusFilter || undefined,
    limit: 50,
  })

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('documents')) {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  const canDelete = userRole === 'Admin'
  const canVerify = userRole === 'Admin' || userRole === 'Security'

  const handleVerify = async (doc: VisitorDocument, status: VerificationStatus, notes?: string) => {
    try {
      if (status === 'Verified') {
        await verify(doc.id, notes)
        showNotification('success', 'Document verified successfully')
      } else {
        await reject(doc.id, notes)
        showNotification('success', 'Document rejected')
      }
      refetch()
    } catch {
      showNotification('error', 'Action failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This action cannot be undone.')) return
    try {
      await remove(id)
      showNotification('success', 'Document deleted successfully')
      if (previewDoc?.id === id) setPreviewDoc(null)
    } catch {
      showNotification('error', 'Failed to delete document')
    }
  }

  const handleUploadComplete = () => {
    setModalOpen(false)
    refetch()
  }

  const filteredDocuments = useMemo(() => {
    let result = !selectedVisitorId ? documents : documents.filter((d) => d.visitor_id === selectedVisitorId)
    if (clientDateFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0]
      result = result.filter((d) => d.created_at && d.created_at.startsWith(todayStr))
    }
    return result
  }, [documents, selectedVisitorId, clientDateFilter])

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load documents</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Visitor Documents</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {userRole === 'Admin' && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Document
              </button>
            )}
          </div>
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

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by document number, visitor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DocumentType | '')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | '')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {VERIFICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Number</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">File</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{doc.visitor?.full_name || '—'}</span>
                        <span className="text-xs text-gray-500 block">{doc.visitor?.email || ''}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{doc.document_type}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{doc.document_number}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.verification_status as VerificationStatus] || STATUS_COLORS.Pending}`}
                        >
                          {doc.verification_status === 'Verified' && <CheckCircle className="h-3 w-3" />}
                          {doc.verification_status === 'Rejected' && <XCircle className="h-3 w-3" />}
                          {doc.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {doc.file_name ? (
                          <span className="text-xs">{formatFileSize(doc.file_size)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          {canVerify && doc.verification_status !== 'Verified' && (
                            <button
                              onClick={() => setVerifyDoc(doc)}
                              className="p-1 rounded-md hover:bg-green-50 transition-colors"
                              title="Verify"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </button>
                          )}
                          {canVerify && doc.verification_status === 'Verified' && (
                            <button
                              onClick={() => setVerifyDoc(doc)}
                              className="p-1 rounded-md hover:bg-amber-50 transition-colors"
                              title="Change Status"
                            >
                              <XCircle className="h-4 w-4 text-amber-600" />
                            </button>
                          )}
                          <button
                            onClick={() => setModalOpen(true)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(doc.id)}
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

            {!loading && filteredDocuments.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-500">No documents found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DocumentUpload
                visitorId={selectedVisitorId || 'temp-id'}
                onUploadComplete={handleUploadComplete}
                disabled={!selectedVisitorId && userRole !== 'Admin'}
              />
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          showActions={canVerify}
          onReplace={async (file) => {
            await remove(previewDoc.id)
            const formData = new FormData()
            formData.append('visitor_id', previewDoc.visitor_id)
            formData.append('document_type', previewDoc.document_type)
            formData.append('document_number', previewDoc.document_number)
            formData.append('file', file)
            await create(formData)
            showNotification('success', 'Document replaced')
            refetch()
            setPreviewDoc(null)
          }}
          onVerify={
            previewDoc.verification_status === 'Verified'
              ? undefined
              : () => setVerifyDoc(previewDoc)
          }
          onReject={
            previewDoc.verification_status === 'Rejected'
              ? undefined
              : () => setVerifyDoc(previewDoc)
          }
          onDelete={canDelete ? () => handleDelete(previewDoc.id) : undefined}
        />
      )}

      {verifyDoc && (
        <DocumentVerificationModal
          document={verifyDoc}
          onClose={() => setVerifyDoc(null)}
          onVerified={(doc) => handleVerify(doc, 'Verified')}
          onRejected={(doc) => handleVerify(doc, 'Rejected')}
        />
      )}
    </div>
  )
}
