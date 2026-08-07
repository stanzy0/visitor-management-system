'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Download, Printer, CheckCircle2, XCircle, Clock, Phone, Mail, RefreshCw, AlertTriangle } from 'lucide-react'
import type { PortalVisit, PortalLifecycleEvent, PortalDocument, PortalSecurityAlert } from '@/lib/types/portal'
import { PORTAL_STATUS_STYLES, LIFECYCLE_STEPS } from '@/lib/types/portal'
import { logAuditAction } from '@/lib/client/audit'
import { getPortalUrl } from '@/lib/utils/portal-url'

export default function PortalDashboardPage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [visit, setVisit] = useState<PortalVisit | null>(null)
  const [lifecycleEvents, setLifecycleEvents] = useState<PortalLifecycleEvent[]>([])
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [alerts, setAlerts] = useState<PortalSecurityAlert[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const fetchPortalData = useCallback(async () => {
    try {
      setRefreshing(true)
      setWarning(null)

      const baseUrl = `/api/portal/${encodeURIComponent(token)}`
      console.log('[Portal Page] fetching:', baseUrl, 'token:', token)

      const visitRes = await fetch(baseUrl)
      const visitJson = await visitRes.json()
      console.log('Portal API Response', visitJson)
      console.log('Portal Visit', visitJson.data)
      console.log('[Portal Page] visit response status:', visitRes.status, 'ok:', visitRes.ok)

      if (!visitJson.success) {
        const reason = visitJson.reason || 'unknown'
        const message = visitJson.message || visitJson.error || 'Badge not found.'
        console.error('[Portal Page] API returned failure:', reason, message)
        if (!visit) {
          setError(message)
        }
        setLoading(false)
        setRefreshing(false)
        return
      }

      setVisit(visitJson.data)
      console.log('Visit State', visitJson.data)

      // Fetch secondary data in parallel - don't block on failures
      const [lifecycleRes, documentsRes, alertsRes] = await Promise.allSettled([
        fetch(`${baseUrl}/lifecycle`),
        fetch(`${baseUrl}/documents`),
        fetch(`${baseUrl}/alerts`),
      ])

      if (lifecycleRes.status === 'fulfilled') {
        try {
          const json = await lifecycleRes.value.json()
          console.error('[Portal Page] lifecycle response:', json)
          setLifecycleEvents(json.data || [])
        } catch (e) {
          console.error('[Portal Page] lifecycle parse error:', e)
          setLifecycleEvents([])
          setWarning('Some visit history could not be loaded.')
        }
      } else {
        setLifecycleEvents([])
        setWarning('Some visit history could not be loaded.')
      }

      if (documentsRes.status === 'fulfilled') {
        try {
          const json = await documentsRes.value.json()
          console.error('[Portal Page] documents response:', json)
          setDocuments(json.data || [])
        } catch (e) {
          console.error('[Portal Page] documents parse error:', e)
          setDocuments([])
          setWarning('Some documents could not be loaded.')
        }
      } else {
        setDocuments([])
        setWarning('Some documents could not be loaded.')
      }

      if (alertsRes.status === 'fulfilled') {
        try {
          const json = await alertsRes.value.json()
          console.error('[Portal Page] alerts response:', json)
          setAlerts(json.data || [])
        } catch (e) {
          console.error('[Portal Page] alerts parse error:', e)
          setAlerts([])
          setWarning('Some security alerts could not be loaded.')
        }
      } else {
        setAlerts([])
        setWarning('Some security alerts could not be loaded.')
      }

      if (visitJson.data?.id) {
        try {
          await logAuditAction('Portal Viewed', 'portal', visitJson.data.id, JSON.stringify({ token }))
        } catch (auditError) {
          console.error('[Portal Page] audit log failed:', auditError)
        }
      }
    } catch (err) {
      console.error('[Portal Page] fetchPortalData error:', err)
      if (!visit) {
        setError('Failed to load portal data')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    setTimeout(() => fetchPortalData(), 0)
  }, [fetchPortalData])

  useEffect(() => {
    if (!token) return

    const channel = new BroadcastChannel(`portal-${token}`)
    channel.onmessage = () => {
      fetchPortalData()
    }

    return () => {
      channel.close()
    }
  }, [token, fetchPortalData])

  const handleDownloadQR = async () => {
    if (!visit?.badge?.qr_token) return
    await logAuditAction('Portal QR Downloaded', 'portal', visit.id, JSON.stringify({ registration_number: visit.registration_number }))
    const portalUrl = getPortalUrl(visit.badge.qr_token)
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(portalUrl)}`, '_blank')
  }

  const handlePrintQR = async () => {
    if (!visit?.badge?.qr_token) return
    await logAuditAction('Portal QR Printed', 'portal', visit.id, JSON.stringify({ registration_number: visit.registration_number }))
    const portalUrl = getPortalUrl(visit.badge.qr_token)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(portalUrl)}`
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Print QR - ${visit.registration_number}</title></head><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;"><img src="${qrUrl}" style="width:300px;height:300px;" /></body></html>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleFullScreenQR = () => {
    if (!visit?.badge?.qr_token) return
    const portalUrl = getPortalUrl(visit.badge.qr_token)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(portalUrl)}`
    const fullScreenWindow = window.open('', '_blank')
    if (fullScreenWindow) {
      fullScreenWindow.document.write(`<html><head><title>QR Code - ${visit.registration_number}</title></head><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#000;"><img src="${qrUrl}" style="width:100%;max-width:600px;height:auto;" /></body></html>`)
      fullScreenWindow.document.close()
    }
  }

  const handleDownloadBadge = async () => {
    if (!visit?.badge) return
    await logAuditAction('Portal Badge Downloaded', 'portal', visit.id, JSON.stringify({ registration_number: visit.registration_number }))
    alert('Badge download will be available once generated')
  }

  const handlePrintBadge = async () => {
    if (!visit?.badge) return
    await logAuditAction('Portal Badge Printed', 'portal', visit.id, JSON.stringify({ registration_number: visit.registration_number }))
    alert('Badge printing will be available once generated')
  }

  const handleReplaceDocument = async (documentId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentId', documentId)

    const res = await fetch(`/api/portal/${encodeURIComponent(token)}/documents/replace`, {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      await fetchPortalData()
    }
  }

  const handleRemoveDocument = async (documentId: string) => {
    const res = await fetch(`/api/portal/${encodeURIComponent(token)}/documents/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })

    if (res.ok) {
      await fetchPortalData()
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Badge not found.</h3>
            <p className="text-gray-600">{error || 'Please check your QR code and try again.'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.warn('[Portal Page] Non-critical error:', error)
  }

  const visitorName = visit.visitor?.full_name || 'Visitor'
  const visitorCompany = visit.visitor?.visitor_organization
  const hostName = visit.employee?.full_name
  const hostDepartment = visit.employee?.department
  const visitPurpose = visit.purpose
  const badgeNumber = visit.badge?.badge_number
  const statusStyle = PORTAL_STATUS_STYLES[visit.status] || { bg: 'bg-gray-50', text: 'text-gray-700', label: visit.status }
  const checkInTime = visit.check_in_time
  const checkOutTime = visit.check_out_time
  const currentStepIndex = LIFECYCLE_STEPS.findIndex((step) => step.status === visit.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {warning && (
        <div className="mx-auto max-w-4xl px-4 lg:px-6 pt-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
            {warning}
          </div>
        </div>
      )}
      {error && (
        <div className="mx-auto max-w-4xl px-4 lg:px-6 pt-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
            {error}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-4xl px-4 lg:px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  {visit.visitor?.photo_url ? (
                    <img src={visit.visitor.photo_url} alt={visitorName} className="h-24 w-24 rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl text-gray-500">{(visitorName || 'V').charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{visitorName}</h1>
                  <p className="text-gray-600 mt-1">Registration: <span className="font-mono font-semibold">{visit.registration_number}</span></p>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                    <span className="text-sm text-gray-500">Type: {visit.visitor_type}</span>
                  </div>
                </div>
              </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Visitor Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Visitor Name</p>
              <p className="text-sm font-medium text-gray-900">{visitorName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="text-sm font-medium text-gray-900">{visitorCompany || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Host Employee</p>
              <p className="text-sm font-medium text-gray-900">{hostName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Host Department</p>
              <p className="text-sm font-medium text-gray-900">{hostDepartment || 'N/A'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-500">Visit Purpose</p>
              <p className="text-sm font-medium text-gray-900">{visitPurpose || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Badge Number</p>
              <p className="text-sm font-medium text-gray-900">{badgeNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-sm font-medium text-gray-900">{statusStyle.label}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-In Time</p>
              <p className="text-sm font-medium text-gray-900">{checkInTime ? new Date(checkInTime).toLocaleString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-Out Time</p>
              <p className="text-sm font-medium text-gray-900">{checkOutTime ? new Date(checkOutTime).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Visit Progress</h2>
          <div className="space-y-4">
            {LIFECYCLE_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              return (
                <div key={step.status} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</p>
                    {isCurrent && <p className="text-xs text-gray-500 mt-0.5">Current status</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {visit.badge?.qr_token && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your QR Code</h2>
            <div className="flex flex-col items-center">
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getPortalUrl(visit.badge!.qr_token))}`} alt="QR Code" className="h-48 w-48 mb-4" />
              <p className="text-sm text-gray-500 mb-4">{visit.registration_number}</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleDownloadQR} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]">
                  <Download className="h-4 w-4" /> Download QR
                </button>
                <button onClick={handlePrintQR} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
                  <Printer className="h-4 w-4" /> Print QR
                </button>
                <button onClick={handleFullScreenQR} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
                  <RefreshCw className="h-4 w-4" /> Full Screen
                </button>
              </div>
            </div>
          </div>
        )}

        {visit.appointment && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Appointment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Date</p><p className="text-sm font-medium text-gray-900">{visit.appointment.appointment_date}</p></div>
              <div><p className="text-sm text-gray-500">Time</p><p className="text-sm font-medium text-gray-900">{visit.appointment.appointment_time || 'TBD'}</p></div>
              <div><p className="text-sm text-gray-500">Expected Duration</p><p className="text-sm font-medium text-gray-900">{visit.appointment.expected_arrival || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Purpose</p><p className="text-sm font-medium text-gray-900">{visit.appointment.purpose || 'N/A'}</p></div>
            </div>
          </div>
        )}

        {visit.employee && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Host Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Host Name</p><p className="text-sm font-medium text-gray-900">{visit.employee.full_name}</p></div>
              <div><p className="text-sm text-gray-500">Department</p><p className="text-sm font-medium text-gray-900">{visit.employee.department || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Office Location</p><p className="text-sm font-medium text-gray-900">{visit.employee.office_location || 'N/A'}</p></div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Documents</h2>
          <div className="space-y-3">
            {documents.map((doc) => {
              const isReplacementRequired = doc.verification_status === 'Rejected' || doc.verification_status === 'Replacement Requested'
              return (
                <div key={doc.id} className={`flex items-center justify-between p-4 rounded-lg ${isReplacementRequired ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{doc.document_type}</p>
                      {isReplacementRequired && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                          <AlertTriangle className="h-3 w-3" />
                          Replacement Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{doc.file_name || 'No file name'}</p>
                    {doc.verification_notes && (
                      <p className="text-xs text-orange-600 mt-1">{doc.verification_notes}</p>
                    )}
                  </div>
                  {visit.status === 'pending' && (
                    <div className="flex gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer min-h-[44px]">
                        Replace
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleReplaceDocument(doc.id, e.target.files[0])} />
                      </label>
                      <button onClick={() => handleRemoveDocument(doc.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[44px]">Remove</button>
                    </div>
                  )}
                </div>
              )
            })}
            {documents.length === 0 && <p className="text-sm text-gray-500">No documents uploaded</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security Status</h2>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg ${alert.is_resolved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No security alerts</p>
          )}
        </div>

        {visit.badge && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Badge Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Badge Number</p><p className="text-sm font-medium text-gray-900">{visit.badge.badge_number}</p></div>
              <div><p className="text-sm text-gray-500">Status</p><p className="text-sm font-medium text-gray-900">{visit.badge.badge_status}</p></div>
              <div><p className="text-sm text-gray-500">Issued At</p><p className="text-sm font-medium text-gray-900">{visit.badge.issued_at ? new Date(visit.badge.issued_at).toLocaleString() : 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Expires At</p><p className="text-sm font-medium text-gray-900">{visit.badge.expires_at ? new Date(visit.badge.expires_at).toLocaleString() : 'N/A'}</p></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleDownloadBadge} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]"><Download className="h-4 w-4" /> Download Badge</button>
              <button onClick={handlePrintBadge} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]"><Printer className="h-4 w-4" /> Print Badge</button>
            </div>
          </div>
        )}

        {visit.status === 'approved' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">Arrival Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-green-800">
              <li>Bring your original identification.</li>
              <li>Present your QR code at the gate.</li>
              <li>Proceed to Reception after Security Clearance.</li>
              <li>Your visitor badge will be printed automatically.</li>
            </ul>
          </div>
        )}

        {visit.status === 'rejected' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">This visit was declined</h2>
            <p className="text-sm text-red-800">Reason: {visit.rejection_reason || 'No reason provided'}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Need Assistance?</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">Reception: +234 803 000 0000</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <a href="mailto:reception@afcsc.edu.ng" className="text-sm text-blue-600 hover:underline">reception@afcsc.edu.ng</a>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={fetchPortalData} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  )
}
