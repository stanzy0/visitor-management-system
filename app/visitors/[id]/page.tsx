'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { generateVisitQRCode } from '@/lib/qrcode'
import { Loader2, QrCode, Printer, Edit, ArrowLeft, X, Upload, Trash2, FileText, CheckCircle, XCircle, Eye } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string
  photo_url: string | null
  created_at: string
}

interface Visit {
  id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  qr_code: string | null
  employee: { full_name: string; department: string } | null
}

interface AuditLog {
  id: string
  action: string
  details: string
  performed_by: string
  created_at: string
}

export default function VisitorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [generatingQR, setGeneratingQR] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState({ full_name: '', email: '', phone: '', visitor_organization: '' })
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setVisitorId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

   useEffect(() => {
    if (!visitorId) return

    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      await fetchVisitor()
      await fetchVisits()
      await fetchDocuments()
    }
    checkAuth()
  }, [visitorId])

  useEffect(() => {
    if (!authChecking && visitorId && visits.length >= 0) {
      fetchAuditLogs()
    }
  }, [visits, visitorId])

  const fetchDocuments = async () => {
    if (!visitorId) return
    const { data } = await supabase
      .from('visitor_documents')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })

    if (data) {
      setDocuments(data)
    }
  }

  const fetchVisitor = async () => {
    if (!visitorId) return
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single()

    if (error) {
      console.error('Error fetching visitor:', error)
    } else {
      setVisitor(data)
    }
  }

  const fetchVisits = async () => {
    if (!visitorId) return
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        employee:employees(full_name, department)
      `)
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching visits:', error)
    } else {
      setVisits(data || [])
    }
  }

  const handleGenerateQRCode = async (visitId: string) => {
    setGeneratingQR(visitId)
    try {
      const qrCode = await generateVisitQRCode(visitId)
      const { error } = await supabase
        .from('visits')
        .update({ qr_code: qrCode })
        .eq('id', visitId)

      if (error) {
        console.error('Error saving QR code:', error)
      } else {
        await fetchVisits()
        logAuditAction('QR Code Generated', 'visit', visitId, `QR code generated for visitor ${visitor?.full_name}`)
      }
    } catch (err) {
      console.error('Error generating QR code:', err)
    } finally {
      setGeneratingQR(null)
    }
  }

  const validatePhotoFile = (file: File): string | null => {
    if (!file) return null
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) return 'Only JPG, JPEG, and PNG files are allowed'
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) return 'File size must be less than 5MB'
    return null
  }

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const error = validatePhotoFile(file)
    if (error) { setEditPhotoError(error); return }
    setEditPhotoError(null)
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  const handleEditPhotoUpload = async (): Promise<string | null> => {
    if (!editPhotoFile) return null
    const sanitizedFileName = editPhotoFile.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-')
    const fileName = `${Date.now()}-${sanitizedFileName}`
    try {
      const { error } = await supabase.storage.from('visitor-photos').upload(fileName, editPhotoFile)
      if (error) throw error
      const { data: publicUrlData } = supabase.storage.from('visitor-photos').getPublicUrl(fileName)
      setEditPhotoPreview(null)
      setEditPhotoFile(null)
      return publicUrlData.publicUrl
    } catch (err) {
      const errorObj = err as { message?: string }
      setEditPhotoError(errorObj.message || 'Failed to upload photo')
      return null
    }
  }

   const openEditModal = () => {
     if (visitor) {
       setEditFormData({ full_name: visitor.full_name, email: visitor.email, phone: visitor.phone, visitor_organization: visitor.visitor_organization })
       setEditModalOpen(true)
     }
   }

  const openQrModal = async () => {
    setQrModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitorId) return
    setEditSubmitting(true)
    let photoUrl = visitor?.photo_url
    if (editPhotoFile) {
      const uploadedUrl = await handleEditPhotoUpload()
      if (!uploadedUrl && editPhotoFile) { setEditSubmitting(false); return }
      photoUrl = uploadedUrl
    }
    const { error } = await supabase
      .from('visitors')
      .update({ full_name: editFormData.full_name, email: editFormData.email, phone: editFormData.phone, visitor_organization: editFormData.visitor_organization, photo_url: photoUrl })
      .eq('id', visitorId)
    if (error) {
      console.error('Error updating visitor:', error)
    } else {
      logAuditAction('Visitor Updated', 'visitor', visitorId, `Visitor ${editFormData.full_name} updated`)
      setEditModalOpen(false)
      fetchVisitor()
    }
    setEditSubmitting(false)
  }

  const handleDelete = async () => {
    if (!visitorId) return
    setDeleting(true)
    const { error } = await supabase.from('visitors').delete().eq('id', visitorId)
    if (error) {
      console.error('Error deleting visitor:', error)
    } else {
      logAuditAction('Visitor Deleted', 'visitor', visitorId, `Visitor ${visitor?.full_name} deleted`)
      window.location.href = '/visitors'
    }
    setDeleting(false)
  }

  const fetchAuditLogs = async () => {
    if (!visitorId) return
    const visitIds = visits.map((v) => v.id)

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', visitorId)
      .eq('entity_type', 'visitor')
      .order('created_at', { ascending: false })

    if (visitIds.length > 0) {
      const { data: visitLogs, error: visitError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('entity_id', visitIds)
        .eq('entity_type', 'visit')
        .order('created_at', { ascending: false })

      if (visitError) {
        console.error('Error fetching visit audit logs:', visitError)
        setAuditLogs([])
        return
      }

      const { data: visitorLogs, error: visitorError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', visitorId)
        .eq('entity_type', 'visitor')
        .order('created_at', { ascending: false })

      if (!visitorError) {
        const combined = [...(visitorLogs || []), ...(visitLogs || [])].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setAuditLogs(combined)
      }
      return
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
    } else {
      setAuditLogs(data || [])
    }
  }

  if (authChecking || !visitorId) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <a href="/visitors" className="text-sm text-blue-600 hover:underline">
              ← Back to Visitors
            </a>
          </div>
          <p className="text-gray-500">Visitor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/visitors" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Visitors
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Visitor Details</h1>
          <div className="flex gap-2">
            {PERMISSIONS['Admin']?.includes('delete-records') && (
              <button onClick={openEditModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                <Edit className="h-4 w-4" />
                Edit Visitor
              </button>
            )}
            {PERMISSIONS['Admin']?.includes('delete-records') && (
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete Visitor
              </button>
            )}
            <a href={`/visitors/${visitorId}/badge`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Printer className="h-4 w-4" />
              Print Badge
            </a>
            <button onClick={openQrModal} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <QrCode className="h-4 w-4" />
              QR Code
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex flex-col items-center">
                {visitor.photo_url ? (
                  <img
                    src={visitor.photo_url}
                    alt={visitor.full_name}
                    className="h-32 w-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <span className="text-3xl text-gray-500">
                      {visitor.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">{visitor.full_name}</h2>
                <p className="text-gray-600">{visitor.visitor_organization || '—'}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="text-sm text-gray-900">{visitor.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Phone</p>
                  <p className="text-sm text-gray-900">{visitor.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Visitor Organization</p>
                  <p className="text-sm text-gray-900">{visitor.visitor_organization || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Visitor Type</p>
                  <p className="text-sm text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">ID Type</p>
                  <p className="text-sm text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Registered Date</p>
                  <p className="text-sm text-gray-900">
                    {visitor.created_at ? new Date(visitor.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Visit History</h3>
              </div>
              <div className="overflow-x-auto">
                {visits.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 w-32">QR Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visits.map((visit) => (
                        <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{visit.status.replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            {visit.qr_code ? (
                              <div className="flex flex-col items-center">
                                <img
                                  src={visit.qr_code}
                                  alt="Visitor QR Code"
                                  width={160}
                                  height={160}
                                  className="rounded-lg border"
                                />
                                <span className="text-xs text-gray-500 mt-1">#{visit.id.slice(0, 8)}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateQRCode(visit.id)}
                                disabled={generatingQR === visit.id}
                                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {generatingQR === visit.id ? 'Generating...' : 'Generate QR'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No visit records found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              </div>
              <div className="overflow-x-auto">
                {documents.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Number</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Expiry</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Verified By</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
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
                          <td className="px-4 py-3 text-gray-600">
                            {doc.verified_by || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="View Images"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Audit History</h3>
              </div>
              <div className="overflow-x-auto">
                {auditLogs.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Details</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Performed By</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                          <td className="px-4 py-3 text-gray-600">{log.details || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{log.performed_by}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No audit records found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Visitor</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={editFormData.full_name} onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Organization</label>
                  <input type="text" value={editFormData.visitor_organization} onChange={(e) => setEditFormData({ ...editFormData, visitor_organization: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo (JPG/PNG, max 5MB)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-600">Upload Photo</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleEditPhotoChange} className="hidden" />
                    </label>
                  </div>
                  {editPhotoPreview && <img src={editPhotoPreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover mt-3" />}
                  {editPhotoError && <p className="mt-1 text-sm text-red-600">{editPhotoError}</p>}
                </div>
              </div>
              <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">{editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">QR Code</h2>
              <button onClick={() => setQrModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{visitor?.full_name}</p>
              <p className="text-xs text-gray-500 mb-4">Badge #: {visits.find(v => v.status === 'approved')?.id?.slice(0, 8) || '—'}</p>
              {visits.find(v => v.status === 'approved')?.qr_code ? (
                <img src={visits.find(v => v.status === 'approved')?.qr_code || ''} alt="QR Code" width={256} height={256} className="mx-auto mb-4" />
              ) : (
                <div className="w-64 h-64 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No QR Available</p>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={() => {
                  const qr = visits.find(v => v.status === 'approved')?.qr_code
                  if (qr) {
                    const link = document.createElement('a')
                    link.href = qr
                    link.download = `visitor-badge-${visitor?.id.slice(0, 8)}.png`
                    link.click()
                  }
                }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Download</button>
                <button onClick={async () => {
                  const approvedVisit = visits.find(v => v.status === 'approved')
                  if (approvedVisit) {
                    const qrCode = await generateVisitQRCode(approvedVisit.id)
                    await supabase.from('visits').update({ qr_code: qrCode }).eq('id', approvedVisit.id)
                    fetchVisits()
                  }
                }} disabled={!visits.some(v => v.status === 'approved')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Regenerate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Document Preview - {previewDoc.document_type}</h3>
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
            <div className="mt-4 text-white text-sm space-y-1">
              <p><strong>Number:</strong> {previewDoc.document_number}</p>
              <p><strong>Status:</strong> {previewDoc.verified ? 'Verified' : 'Unverified'}</p>
              <p><strong>Issuing Country:</strong> {previewDoc.issuing_country || '—'}</p>
              <p><strong>Expiry:</strong> {previewDoc.expiry_date ? new Date(previewDoc.expiry_date).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}