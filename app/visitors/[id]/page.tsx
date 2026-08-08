'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { getAuthHeaders } from '@/lib/client/api'
import { generateVisitQRCode } from '@/lib/qrcode'
import { Loader2, Edit, ArrowLeft, X, Upload, Trash2 } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { VisitorDocument } from '@/lib/types/document'
import DocumentPreview from '@/components/documents/DocumentPreview'
import type { Visitor, Visit } from '@/lib/types/visitor'
import type { VisitorBadge } from '@/lib/types/badge'
import VisitorProfileHeader from '@/components/visitors/VisitorProfileHeader'
import VisitorProfileCard from '@/components/visitors/VisitorProfileCard'
import VisitorBadgeCard from '@/components/visitors/VisitorBadgeCard'
import VisitTimeline from '@/components/visitors/VisitTimeline'
import VisitorDocuments from '@/components/visitors/VisitorDocuments'
import PreviousVisits from '@/components/visitors/PreviousVisits'
import VisitorActionsPanel from '@/components/visitors/VisitorActionsPanel'
import { motion } from 'framer-motion'
import Link from 'next/link'

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
  const [badges, setBadges] = useState<VisitorBadge[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [documents, setDocuments] = useState<VisitorDocument[]>([])
  const [generatingQR, setGeneratingQR] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [visitorError, setVisitorError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState({ full_name: '', email: '', phone: '', visitor_organization: '' })
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<VisitorDocument | null>(null)
  const [docLoading, setDocLoading] = useState(true)

  async function fetchDocuments() {
    if (!visitorId) return
    setDocLoading(true)
    const { data } = await supabase
      .from('visitor_documents')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })

    if (data) {
      setDocuments(data as VisitorDocument[])
    }
    setDocLoading(false)
  }

  async function fetchVisitor() {
    if (!visitorId) return
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', visitorId)
        .single()

      if (error || !data) {
        setVisitorError('Visitor not found')
        setVisitor(null)
      } else {
        setVisitor(data)
        setVisitorError(null)
      }
    } catch {
      setVisitorError('Unable to load visitor details')
    } finally {
      setLoading(false)
    }
  }

  async function fetchVisits() {
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

  async function fetchBadges() {
    if (!visitorId) return
    const visitIds = visits.map(v => v.id)
    if (visitIds.length === 0) {
      setBadges([])
      return
    }
    const { data, error } = await supabase
      .from('visitor_badges')
      .select(`
        *,
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
      .order('issued_at', { ascending: false })

    if (error) {
      console.error('Error fetching badges:', error)
    } else {
      setBadges(data || [])
    }
  }

  async function fetchAuditLogs() {
    if (!visitorId) return
    const visitIds = visits.map(v => v.id)

    const query = supabase
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
      setTimeout(() => {
        fetchBadges()
        fetchAuditLogs()
      }, 0)
    }
  }, [visits, visitorId, authChecking])

  async function handleGenerateQRCode(visitId: string) {
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
        await fetchBadges()
        logAuditAction('QR Code Generated', 'visit', visitId, `QR code generated for visitor ${visitor?.full_name}`)
      }
    } catch (err) {
      console.error('Error generating QR code:', err)
    } finally {
      setGeneratingQR(null)
    }
  }

  function validatePhotoFile(file: File): string | null {
    if (!file) return null
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) return 'Only JPG, JPEG, and PNG files are allowed'
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) return 'File size must be less than 5MB'
    return null
  }

  function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const error = validatePhotoFile(file)
    if (error) { setEditPhotoError(error); return }
    setEditPhotoError(null)
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function handleEditPhotoUpload(): Promise<string | null> {
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

  function openEditModal() {
    if (visitor) {
      setEditFormData({ full_name: visitor.full_name, email: visitor.email, phone: visitor.phone, visitor_organization: visitor.visitor_organization || '' })
      setEditModalOpen(true)
    }
  }

  function openQrModal() {
    setQrModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
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

  async function handleDelete() {
    if (!visitorId) return
    setDeleting(true)
    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/visitors/${visitorId}?id=${visitorId}`, {
      method: 'DELETE',
      headers: { ...authHeaders },
    })
    const result = await res.json().catch(() => ({ success: false }))
    if (!res.ok || !result.success) {
      setDeleting(false)
      alert(result.error || 'Failed to delete visitor')
      return
    }
    window.location.href = '/visitors'
    setDeleting(false)
  }

  const handlePrintBadge = async (visitId: string) => {
    window.open(`/reception/badge-preview/${visitId}`, '_blank')
  }

  const handleReprintBadge = async (visitId: string) => {
    const visit = visits.find(v => v.id === visitId)
    if (visit) {
      await handleGenerateQRCode(visitId)
      window.open(`/reception/badge-preview/${visitId}`, '_blank')
    }
  }

  const handleDownloadBadge = (visitId: string) => {
    window.open(`/api/badges/${visitId}`, '_blank')
  }

  const handleExportPDF = () => {
    window.open(`/visitors/${visitorId}/badge`, '_blank')
  }

  const handleViewBadge = (visitId: string) => {
    window.open(`/reception/badge-preview/${visitId}`, '_blank')
  }

  const handleSuspendVisitor = async () => {
    if (!visitorId) return
    await supabase.from('visitors').update({ status: 'suspended' }).eq('id', visitorId)
    logAuditAction('Visitor Suspended', 'visitor', visitorId, `Visitor ${visitor?.full_name} suspended`)
    fetchVisitor()
  }

  const handleReinstateVisitor = async () => {
    if (!visitorId) return
    await supabase.from('visitors').update({ status: 'active' }).eq('id', visitorId)
    logAuditAction('Visitor Reinstated', 'visitor', visitorId, `Visitor ${visitor?.full_name} reinstated`)
    fetchVisitor()
  }

  const handleBlacklistVisitor = async () => {
    if (!visitorId) return
    await supabase.from('visitors').update({ status: 'blacklisted' }).eq('id', visitorId)
    logAuditAction('Visitor Blacklisted', 'visitor', visitorId, `Visitor ${visitor?.full_name} blacklisted`)
    fetchVisitor()
  }

  const handleViewReports = () => {
    window.open(`/reports?visitor=${visitorId}`, '_blank')
  }

  const handleDownloadHistory = () => {
    const csvContent = [
      ['Date', 'Purpose', 'Host', 'Department', 'Status', 'Duration'],
      ...visits.map(v => [
        v.created_at ? new Date(v.created_at).toLocaleDateString() : '—',
        v.purpose || '—',
        v.employee?.full_name || '—',
        v.employee?.department || '—',
        v.status.replace('_', ' '),
        v.check_in_time && v.check_out_time
          ? `${Math.round((new Date(v.check_out_time).getTime() - new Date(v.check_in_time).getTime()) / (1000 * 60))} min`
          : '—'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `visitor-${visitor?.full_name || 'history'}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const activeVisit = visits.find(v => v.status === 'checked_in' || v.status === 'approved')

  const timelineEvents = useMemo(() => {
    const events: AuditLog[] = []
    visits.forEach(visit => {
      events.push({
        id: `${visit.id}-created`,
        action: 'visit_created',
        details: `Visit created for ${visit.purpose || 'General Visit'}`,
        performed_by: 'System',
        created_at: visit.created_at
      })
      if (visit.status === 'approved') {
        events.push({
          id: `${visit.id}-approved`,
          action: 'visit_approved',
          details: `Visit approved for ${visit.purpose || 'General Visit'}`,
          performed_by: visit.employee?.full_name || 'System',
          created_at: visit.created_at
        })
      }
      if (visit.status === 'checked_in') {
        events.push({
          id: `${visit.id}-checked-in`,
          action: 'visitor_checked_in',
          details: 'Visitor checked in',
          performed_by: 'Security',
          created_at: visit.check_in_time || visit.created_at
        })
      }
      if (visit.status === 'checked_out') {
        events.push({
          id: `${visit.id}-checked-out`,
          action: 'visitor_checked_out',
          details: 'Visitor checked out',
          performed_by: 'Security',
          created_at: visit.check_out_time || visit.created_at
        })
      }
    })
    documents.forEach(doc => {
      events.push({
        id: `doc-${doc.id}`,
        action: 'document_uploaded',
        details: `${doc.document_type} uploaded`,
        performed_by: doc.uploaded_by || 'Visitor',
        created_at: doc.created_at
      })
    })
    return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [visits, documents])

  if (authChecking || loading || !visitorId) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-dashboard-bg">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <Link href="/visitors" className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Visitors
            </Link>
          </div>
          <div className="rounded-[20px] border border-gray-200/60 bg-white p-12 shadow-[0_10px_30px_rgba(0,0,0,0.06)] text-center">
            <p className="text-gray-500">Visitor not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <Link href="/visitors" className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Visitors
          </Link>
        </div>

        <VisitorProfileHeader
          visitor={visitor}
          visits={visits}
          badges={badges}
          onPrintBadge={handlePrintBadge}
          onDownloadBadge={handleDownloadBadge}
          onExportPDF={handleExportPDF}
          onOpenQRModal={openQrModal}
          loading={loading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <VisitorProfileCard
              visitor={visitor}
              loading={loading}
              hasDocument={!!visitor.doc_front_url}
              onViewDocument={() => {
                if (visitor.doc_front_url) {
                  setPreviewDoc({
                    id: visitor.id,
                    visitor_id: visitor.id,
                    document_type: (visitor.doc_type as VisitorDocument['document_type']) || 'Other',
                    document_number: visitor.doc_number || '',
                    issuing_country: visitor.issuing_country || null,
                    expiry_date: visitor.expiry_date || null,
                    front_image_url: visitor.doc_front_url,
                    back_image_url: visitor.doc_back_url || null,
                    file_url: visitor.doc_front_url,
                    file_name: visitor.doc_type || 'ID Document',
                    mime_type: visitor.doc_front_url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                    file_size: 0,
                    verification_status: 'Pending',
                    verification_notes: null,
                    verified: false,
                    verified_by: null,
                    verified_at: null,
                    replacement_requested: false,
                    replacement_uploaded: false,
                    uploaded_by: null,
                    created_at: visitor.created_at,
                    updated_at: visitor.created_at,
                  })
                }
              }}
            />
            <VisitorBadgeCard badges={badges} onPrint={(badge) => handlePrintBadge(badge.visit_id)} onReprint={(badge) => handleReprintBadge(badge.visit_id)} loading={loading} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <VisitTimeline events={timelineEvents} loading={loading} />
            <PreviousVisits visits={visits} onViewBadge={handleViewBadge} onPrintBadge={handlePrintBadge} loading={loading} />
            <VisitorDocuments documents={documents} loading={docLoading} />
          </div>
        </div>

        <VisitorActionsPanel
          visitorId={visitorId}
          onViewBadge={handleViewBadge}
          onPrintBadge={handlePrintBadge}
          onReprintBadge={handleReprintBadge}
          onSuspendVisitor={handleSuspendVisitor}
          onReinstateVisitor={handleReinstateVisitor}
          onBlacklistVisitor={handleBlacklistVisitor}
          onViewReports={handleViewReports}
          onDownloadHistory={handleDownloadHistory}
        />

        <div className="flex flex-wrap gap-3">
          {PERMISSIONS['Admin']?.includes('delete-records') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openEditModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Edit className="h-4 w-4" />
              Edit Visitor
            </motion.button>
          )}
          {PERMISSIONS['Admin']?.includes('delete-records') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete Visitor'}
            </motion.button>
          )}
        </div>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
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
                      <Upload className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload Photo</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleEditPhotoChange} className="hidden" />
                    </label>
                  </div>
                  {editPhotoPreview && <img src={editPhotoPreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover mt-3" />}
                  {editPhotoError && <p className="mt-1 text-sm text-red-600">{editPhotoError}</p>}
                </div>
              </div>
              <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
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
              <p className="text-xs text-gray-500 mb-4">Badge #: {activeVisit?.id?.slice(0, 8) || '—'}</p>
              {activeVisit?.qr_code ? (
                <img src={activeVisit.qr_code} alt="QR Code" width={256} height={256} className="mx-auto mb-4" />
              ) : (
                <div className="w-64 h-64 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No QR Available</p>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={() => {
                  const qr = activeVisit?.qr_code
                  if (qr) {
                    const link = document.createElement('a')
                    link.href = qr
                    link.download = `visitor-badge-${visitor?.id.slice(0, 8)}.png`
                    link.click()
                  }
                }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Download</button>
                <button onClick={async () => {
                  if (activeVisit) {
                    const qrCode = await generateVisitQRCode(activeVisit.id)
                    await supabase.from('visits').update({ qr_code: qrCode }).eq('id', activeVisit.id)
                    fetchVisits()
                    fetchBadges()
                  }
                }} disabled={!activeVisit} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">Regenerate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          showActions={false}
        />
      )}
    </div>
  )
}
