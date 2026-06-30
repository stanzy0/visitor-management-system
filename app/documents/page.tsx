'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Edit, Trash2, X, Loader2, CheckCircle, XCircle, Upload, Camera, Eye } from 'lucide-react'

interface VisitorDocument {
  id: string
  visitor_id: string
  document_type: string
  document_number: string
  issuing_country: string | null
  expiry_date: string | null
  front_image_url: string | null
  back_image_url: string | null
  verified: boolean
  verified_by: string | null
  verification_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  visitor?: { full_name: string; email: string }
}

const DOCUMENT_TYPES = [
  'National ID',
  'Driver\'s Licence',
  'Passport',
  'Military ID',
  'Staff ID',
  'Other',
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<VisitorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<VisitorDocument | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VisitorDocument | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [formData, setFormData] = useState({
    visitor_id: '',
    document_type: 'National ID',
    document_number: '',
    issuing_country: '',
    expiry_date: '',
    front_image_url: '',
    back_image_url: '',
    notes: '',
  })

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
      fetchDocuments()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visitor_documents')
      .select(`
        *,
        visitor:visitors(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      showNotification('error', error.message)
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_documents' },
        () => {
          fetchDocuments()
        }
      )
      .subscribe()
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const openCreateModal = () => {
    setEditingDoc(null)
    setFormData({
      visitor_id: '',
      document_type: 'National ID',
      document_number: '',
      issuing_country: '',
      expiry_date: '',
      front_image_url: '',
      back_image_url: '',
      notes: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (doc: VisitorDocument) => {
    setEditingDoc(doc)
    setFormData({
      visitor_id: doc.visitor_id,
      document_type: doc.document_type,
      document_number: doc.document_number,
      issuing_country: doc.issuing_country || '',
      expiry_date: doc.expiry_date || '',
      front_image_url: doc.front_image_url || '',
      back_image_url: doc.back_image_url || '',
      notes: doc.notes || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const user = await getCurrentUser()
    if (!user) return

    const payload = {
      visitor_id: formData.visitor_id,
      document_type: formData.document_type,
      document_number: formData.document_number,
      issuing_country: formData.issuing_country || null,
      expiry_date: formData.expiry_date || null,
      front_image_url: formData.front_image_url,
      back_image_url: formData.back_image_url || null,
      notes: formData.notes || null,
    }

    let error
    if (editingDoc) {
      const result = await supabase
        .from('visitor_documents')
        .update(payload)
        .eq('id', editingDoc.id)
      error = result.error
      if (!error) {
        showNotification('success', 'Document updated successfully')
      }
    } else {
      const result = await supabase
        .from('visitor_documents')
        .insert([payload])
      error = result.error
      if (!error) {
        showNotification('success', 'Document added successfully')
      }
    }

    if (error) {
      showNotification('error', error.message)
    }

    setSubmitting(false)
    setModalOpen(false)
  }

  const handleVerify = async (doc: VisitorDocument) => {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .from('visitor_documents')
      .update({
        verified: !doc.verified,
        verified_by: user.id,
        verification_date: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (error) {
      showNotification('error', error.message)
    } else {
      showNotification('success', doc.verified ? 'Document unverified' : 'Document verified')
    }
  }

  const handleDelete = async (doc: VisitorDocument) => {
    if (!confirm(`Delete document for visitor?`)) return

    const { error } = await supabase
      .from('visitor_documents')
      .delete()
      .eq('id', doc.id)

    if (error) {
      showNotification('error', error.message)
    } else {
      showNotification('success', 'Document deleted')
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.visitor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = !typeFilter || doc.document_type === typeFilter
    const matchesStatus = !statusFilter || (statusFilter === 'verified' ? doc.verified : !doc.verified)

    return matchesSearch && matchesType && matchesStatus
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
          <h1 className="text-2xl font-bold text-gray-900">Visitor Documents</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDocuments}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
            {userRole === 'Admin' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Document
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
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by document number or visitor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Expiry</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-36">Actions</th>
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
                      <td className="px-4 py-3 text-gray-600">
                        {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${doc.verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {doc.verified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {doc.verified ? 'Verified' : 'Unverified'}
                        </span>
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
                          <button
                            onClick={() => handleVerify(doc)}
                            className={`p-1 rounded-md transition-colors ${doc.verified ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                            title={doc.verified ? 'Unverify' : 'Verify'}
                          >
                            {doc.verified ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                          </button>
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          {userRole === 'Admin' && (
                            <button
                              onClick={() => handleDelete(doc)}
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

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDoc ? 'Edit Document' : 'Add Document'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visitor ID *</label>
                  <input
                    type="text"
                    value={formData.visitor_id}
                    onChange={(e) => setFormData({ ...formData, visitor_id: e.target.value })}
                    required
                    placeholder="Enter visitor UUID"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                    <select
                      value={formData.document_type}
                      onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
                    <input
                      type="text"
                      value={formData.document_number}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      required
                      placeholder="Enter document number"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country</label>
                    <input
                      type="text"
                      value={formData.issuing_country}
                      onChange={(e) => setFormData({ ...formData, issuing_country: e.target.value })}
                      placeholder="Enter country"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Front Image URL *</label>
                  <input
                    type="url"
                    value={formData.front_image_url}
                    onChange={(e) => setFormData({ ...formData, front_image_url: e.target.value })}
                    required
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Back Image URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.back_image_url}
                    onChange={(e) => setFormData({ ...formData, back_image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDoc ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Document Preview</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-white hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewDoc.front_image_url && (
                <div>
                  <p className="text-sm text-gray-300 mb-2">Front</p>
                  <img src={previewDoc.front_image_url} alt="Front" className="w-full rounded-lg" />
                </div>
              )}
              {previewDoc.back_image_url && (
                <div>
                  <p className="text-sm text-gray-300 mb-2">Back</p>
                  <img src={previewDoc.back_image_url} alt="Back" className="w-full rounded-lg" />
                </div>
              )}
            </div>
            <div className="mt-4 text-white text-sm">
              <p><strong>Type:</strong> {previewDoc.document_type}</p>
              <p><strong>Number:</strong> {previewDoc.document_number}</p>
              <p><strong>Visitor:</strong> {previewDoc.visitor?.full_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
