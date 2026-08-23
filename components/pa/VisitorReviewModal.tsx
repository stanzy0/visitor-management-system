'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Phone, Building2, User, MapPin, Calendar, Clock, FileText, CheckCircle, XCircle, Loader2, UserCheck, LogOut } from 'lucide-react'

interface VisitorDoc {
  id: string
  document_type?: string | null
  document_number?: string | null
  doc_front_url?: string | null
  status?: string | null
}

interface VisitDetail {
  id: string
  purpose: string
  status: string
  scheduled_date?: string | null
  arrival_time?: string | null
  created_at?: string | null
  check_in_time?: string | null
  office_location?: string | null
  rejection_reason?: string | null
  check_out_time?: string | null
  visitor: {
    id: string
    full_name: string
    email?: string | null
    phone?: string | null
    visitor_organization?: string | null
    photo_url?: string | null
  } | null
  employee: {
    id: string
    full_name: string
    department?: string | null
    office_location?: string | null
  } | null
  visitor_documents?: VisitorDoc[] | null
}

interface VisitorReviewModalProps {
  visitId: string | null
  hostLabel: string
  onClose: () => void
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    checked_in: 'bg-green-50 text-green-700 border-green-200',
    checked_out: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] || map.checked_out}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function VisitorReviewModal({ visitId, hostLabel, onClose }: VisitorReviewModalProps) {
  const [detail, setDetail] = useState<VisitDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'check_in' | 'check_out' | null>(null)
  const [confirmReject, setConfirmReject] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!visitId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setConfirmReject(false)
    setReason('')

    fetch(`/api/pa/visits/${visitId}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return
        if (!json.success || !json.data) {
          setError(json.message || 'Failed to load visitor details')
        } else {
          setDetail(json.data)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load visitor details')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [visitId])

  const refreshDetail = async () => {
    if (!visitId) return
    const res = await fetch(`/api/pa/visits/${visitId}`)
    const json = await res.json()
    if (json.success && json.data) {
      setDetail(json.data)
    }
  }

  const handleApprove = async () => {
    if (!visitId) return
    setAction('approve')
    try {
      const res = await fetch(`/api/pa/visits/${visitId}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.message || 'Failed to approve visitor')
        setAction(null)
        return
      }
      await refreshDetail()
      setAction(null)
    } catch {
      setError('Failed to approve visitor')
      setAction(null)
    }
  }

  const handleReject = async () => {
    if (!visitId) return
    setAction('reject')
    try {
      const res = await fetch(`/api/pa/visits/${visitId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.message || 'Failed to reject visitor')
        setAction(null)
        return
      }
      await refreshDetail()
      setAction(null)
    } catch {
      setError('Failed to reject visitor')
      setAction(null)
    }
  }

  const handleCheckIn = async () => {
    if (!visitId) return
    setAction('check_in')
    try {
      const res = await fetch(`/api/visits/${visitId}/status?id=${visitId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_in' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.message || 'Failed to check in visitor')
        setAction(null)
        return
      }
      await refreshDetail()
      setAction(null)
    } catch {
      setError('Failed to check in visitor')
      setAction(null)
    }
  }

  const handleCheckOut = async () => {
    if (!visitId) return
    setAction('check_out')
    try {
      const res = await fetch(`/api/visits/${visitId}/status?id=${visitId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_out' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.message || 'Failed to check out visitor')
        setAction(null)
        return
      }
      await refreshDetail()
      setAction(null)
    } catch {
      setError('Failed to check out visitor')
      setAction(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Review Visitor — Assigned {hostLabel}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-5 px-6 py-5">
            <div className="flex items-center gap-4">
              {detail.visitor?.photo_url ? (
                <img src={detail.visitor.photo_url} alt={detail.visitor.full_name} className="h-20 w-20 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <User className="h-8 w-8" />
                </div>
              )}
              <div>
                <p className="text-xl font-semibold text-gray-900">{detail.visitor?.full_name || 'Unknown Visitor'}</p>
                <div className="mt-1"><StatusBadge status={detail.status} /></div>
                {detail.status === 'rejected' && detail.rejection_reason && (
                  <p className="mt-2 text-sm text-red-600">Reason: {detail.rejection_reason}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={detail.visitor?.email || 'N/A'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={detail.visitor?.phone || 'N/A'} />
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company" value={detail.visitor?.visitor_organization || 'N/A'} />
              <InfoRow icon={<User className="h-4 w-4" />} label="Purpose" value={detail.purpose || 'N/A'} />
              <InfoRow icon={<User className="h-4 w-4" />} label="Host Employee" value={detail.employee?.full_name || 'N/A'} />
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Host Department" value={detail.employee?.department || 'N/A'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Office Location" value={detail.office_location || detail.employee?.office_location || 'N/A'} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Visit Date" value={detail.scheduled_date || (detail.created_at ? detail.created_at.split('T')[0] : 'N/A')} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Visit Time" value={detail.check_in_time || detail.arrival_time || 'N/A'} />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" /> Visitor Documents
              </p>
              {detail.visitor_documents && detail.visitor_documents.length > 0 ? (
                <div className="space-y-2">
                  {detail.visitor_documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.document_type || 'Document'}</p>
                        {doc.document_number && <p className="text-xs text-gray-500">{doc.document_number}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {doc.status && <StatusBadge status={doc.status} />}
                        {doc.doc_front_url && (
                          <a href={doc.doc_front_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">View</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents submitted.</p>
              )}
            </div>

            {detail.status === 'pending' && !confirmReject && (
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={handleApprove}
                  disabled={action === 'approve'}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {action === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  onClick={() => setConfirmReject(true)}
                  disabled={action === 'approve'}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}

            {detail.status === 'pending' && confirmReject && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Rejection Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Provide a reason for rejection..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleReject}
                    disabled={action === 'reject'}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {action === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => setConfirmReject(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {detail.status === 'approved' && (
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={handleCheckIn}
                  disabled={action === 'check_in'}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {action === 'check_in' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Check In
                </button>
              </div>
            )}

            {detail.status === 'checked_in' && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {detail.check_in_time && (
                  <p className="text-sm text-gray-500">
                    Checked in at {new Date(detail.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <button
                  onClick={handleCheckOut}
                  disabled={action === 'check_out'}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {action === 'check_out' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Check Out
                </button>
              </div>
            )}

            {(detail.status === 'checked_out' || detail.status === 'rejected') && (
              <div className="border-t border-gray-100 pt-4 text-sm text-gray-500">
                {detail.status === 'checked_out' && detail.check_in_time && (
                  <p>Checked in at {new Date(detail.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {detail.status === 'checked_out' && detail.check_out_time && (
                  <p>Checked out at {new Date(detail.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {detail.status === 'rejected' && detail.rejection_reason && (
                  <p>Reason: {detail.rejection_reason}</p>
                )}
                <p className="mt-1">No further action required.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
