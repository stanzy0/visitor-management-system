'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, Clock, Download, Printer, Mail } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client/api'
import { getPortalUrl } from '@/lib/utils/portal-url'

interface Invitation {
  id: string
  invitation_token: string
  visitor_name: string
  visitor_email: string
  visitor_phone?: string
  visitor_organization?: string
  purpose: string
  expected_date: string
  expected_time?: string
  vehicle_required: boolean
  number_of_visitors: number
  notes?: string
  status: string
  expires_at: string
  registration_completed_at?: string
  created_at: string
  host: {
    full_name: string
    department?: string
    email?: string
  }
  badge?: {
    id: string
    badge_number: string
    badge_status: string
    issued_at: string
    expires_at: string
    qr_token: string
  } | null
}

interface VisitorStatusCardProps {
  invitation: Invitation
}

export default function VisitorStatusCard({ invitation }: VisitorStatusCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [badge, setBadge] = useState(invitation.badge)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBadge(invitation.badge)
  }, [invitation.badge])

  const handleDownloadBadge = async () => {
    if (!badge) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/badges/${badge.id}`)
      if (!res.ok) throw new Error('Failed to fetch badge')
      const { data } = await res.json()
      
      const pdf = new (await import('jspdf')).default()
      pdf.setFontSize(20)
      pdf.setTextColor(37, 99, 235)
      pdf.text('VISITOR BADGE', 105, 20, { align: 'center' })
      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, 25, 190, 25)
      pdf.setFontSize(12)
      pdf.setTextColor(60, 60, 60)
      pdf.text(`Badge Number: ${badge.badge_number}`, 20, 35)
      pdf.text(`Status: ${badge.badge_status}`, 20, 42)
      pdf.text(`Issued: ${badge.issued_at ? new Date(badge.issued_at).toLocaleString() : '—'}`, 20, 49)
      pdf.text(`Expires: ${badge.expires_at ? new Date(badge.expires_at).toLocaleString() : '—'}`, 20, 56)
      pdf.text(`Visitor: ${invitation.visitor_name}`, 20, 66)
      pdf.text(`Organization: ${invitation.visitor_organization || '—'}`, 20, 73)
      pdf.text(`Host: ${invitation.host.full_name}`, 20, 80)
      pdf.text(`Purpose: ${invitation.purpose}`, 20, 87)
      
      const QRCodeToDataURL = (await import('qrcode')).default
      const qrDataUrl = await QRCodeToDataURL(
        getPortalUrl(badge.qr_token),
        { width: 120, margin: 1 }
      )
      pdf.addImage(qrDataUrl, 'PNG', 140, 60, 50, 50)
      
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text('Scan for check-in/out and verification', 165, 115, { align: 'center' })
      
      pdf.save(`badge-${badge.badge_number}.pdf`)
      
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          action: 'Visitor Downloaded Badge',
          entityType: 'badge',
          entityId: badge.id,
          details: `Visitor ${invitation.visitor_name} downloaded badge ${badge.badge_number}`,
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download badge')
    } finally {
      setLoading(false)
    }
  }

   const handlePrintBadge = async () => {
      if (!badge) return

      try {
        const { printBadgeWindow } = await import('@/lib/badge/badge-print')
        await printBadgeWindow(badge.id)

        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
          body: JSON.stringify({
            action: 'Visitor Printed Badge',
            entityType: 'badge',
            entityId: badge.id,
            details: `Visitor ${invitation.visitor_name} printed badge ${badge.badge_number}`,
          }),
        })
      } catch {
        // popup blocked or print failed
      }
    }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-5 w-5 text-amber-600" />
      case 'Completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'Expired':
        return <XCircle className="h-5 w-5 text-gray-600" />
      case 'Cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'Completed':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'Approved':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'Rejected':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'Expired':
        return 'text-gray-700 bg-gray-50 border-gray-200'
      case 'Cancelled':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Invitation Status</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(invitation.status)}`}>
            {getStatusIcon(invitation.status)}
            {invitation.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Visitor Name</p>
            <p className="font-medium text-gray-900">{invitation.visitor_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{invitation.visitor_email}</p>
          </div>
          <div>
            <p className="text-gray-500">Host</p>
            <p className="font-medium text-gray-900">{invitation.host.full_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Department</p>
            <p className="font-medium text-gray-900">{invitation.host.department || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Visit Date</p>
            <p className="font-medium text-gray-900">{invitation.expected_date}</p>
          </div>
          <div>
            <p className="text-gray-500">Visit Time</p>
            <p className="font-medium text-gray-900">{invitation.expected_time || 'TBD'}</p>
          </div>
          <div>
            <p className="text-gray-500">Purpose</p>
            <p className="font-medium text-gray-900">{invitation.purpose}</p>
          </div>
          <div>
            <p className="text-gray-500">Expires</p>
            <p className="font-medium text-gray-900">{invitation.expires_at ? new Date(invitation.expires_at).toLocaleString() : '—'}</p>
          </div>
        </div>
      </div>

      {badge && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Badge Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500">Badge Number</p>
              <p className="font-mono font-medium text-gray-900">{badge.badge_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Badge Status</p>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                badge.badge_status === 'Active' ? 'text-green-700 bg-green-50 border-green-200' :
                badge.badge_status === 'Expired' ? 'text-red-700 bg-red-50 border-red-200' :
                'text-gray-700 bg-gray-50 border-gray-200'
              }`}>
                {badge.badge_status}
              </span>
            </div>
            <div>
              <p className="text-gray-500">Issued At</p>
              <p className="font-medium text-gray-900">{badge.issued_at ? new Date(badge.issued_at).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Expires At</p>
              <p className="font-medium text-gray-900">{badge.expires_at ? new Date(badge.expires_at).toLocaleString() : '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadBadge}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Badge
            </button>
            <button
              onClick={handlePrintBadge}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Print Badge
            </button>
          </div>
        </div>
      )}

      {!badge && invitation.status === 'Approved' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Your badge is being prepared. Please check back later.</p>
        </div>
      )}

      {invitation.status === 'Pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-6 text-center">
          <Clock className="h-12 w-12 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Awaiting Approval</h3>
          <p className="text-gray-600">Your registration is pending approval by {invitation.host.full_name}. You will receive an email once it is approved.</p>
        </div>
      )}
    </div>
  )
}
