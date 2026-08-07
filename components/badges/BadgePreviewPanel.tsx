'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, Download, Printer, X, Edit3, CheckCircle2 } from 'lucide-react'
import type { BadgePreviewVisit, BadgeTemplateOption } from '@/lib/types/badge-preview'
import type { VisitorBadge } from '@/lib/badge/badge-types'
import BadgeLayout from '@/components/BadgeLayout'
import BadgePreviewToolbar from '@/components/badges/BadgePreviewToolbar'
import BadgeValidationChecklist from '@/components/badges/BadgeValidationChecklist'
import { supabase } from '@/lib/supabase'

interface BadgePreviewPanelProps {
  visit: BadgePreviewVisit
  templates: BadgeTemplateOption[]
  onApprove: () => void
  onReject: (reason: string) => void
  onCancel: () => void
  onEdit: () => void
  saving: boolean
}

export default function BadgePreviewPanel({
  visit,
  templates,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  saving,
}: BadgePreviewPanelProps) {
  const router = useRouter()
  const [template, setTemplate] = useState<BadgeTemplateOption | null>(
    templates.find(t => t.is_default) || templates[0] || null
  )
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 24)
    return d.toISOString().split('T')[0]
  })
  const [expiryTime, setExpiryTime] = useState('17:00')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [secondaryColor, setSecondaryColor] = useState('#1e40af')
  const [textColor, setTextColor] = useState('#1f2937')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [realBadgeId, setRealBadgeId] = useState<string | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)

  const visitor = visit.visitor
  const employee = visit.employee

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const { data } = await supabase
          .from('visitor_badges')
          .select('id')
          .eq('visit_id', visit.id)
          .maybeSingle()

        if (data?.id) {
          setRealBadgeId(data.id)
        }
      } catch {
        // ignore
      }
    }

    fetchBadge()
  }, [visit.id])

  const handlePrint = async () => {
    setPrintError(null)

    if (!realBadgeId) {
      setPrintError('No issued badge found for this visit. Please approve the registration first.')
      return
    }

    try {
      const { printBadgeWindow } = await import('@/lib/badge/badge-print')
      await printBadgeWindow(realBadgeId)
    } catch {
      // popup blocked or print failed
    }
  }

  const handleDownload = async () => {
    try {
      const { generateBadgePdf } = await import('@/lib/badge/badge-pdf')
      const badge = {
        ...visit,
        badge_number: `PREVIEW-${Date.now().toString(36).toUpperCase()}`,
        issued_at: new Date().toISOString(),
        expires_at: `${expiryDate}T${expiryTime}:00`,
        badge_status: 'Active' as const,
        template: template,
      }
      await generateBadgePdf(badge as unknown as VisitorBadge)
    } catch (error) {
      console.error('PDF generation failed:', error)
    }
  }

  const previewBadge = {
    id: 'preview',
    visit_id: visit.id,
    badge_number: 'PREVIEW',
    qr_token: 'preview',
    badge_status: 'Active' as const,
    issued_at: new Date().toISOString(),
    expires_at: `${expiryDate}T${expiryTime}:00`,
    printed_at: null,
    printed_by: null,
    reprint_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visit: {
      id: visit.id,
      visitor: visitor ? {
        full_name: visitor.full_name,
        visitor_organization: visitor.visitor_organization,
        photo_url: visitor.photo_url,
      } : null,
      employee: employee ? {
        full_name: employee.full_name,
        department: employee.department,
      } : null,
      purpose: visit.purpose,
      check_in_time: visit.check_in_time,
      check_out_time: visit.check_out_time,
    },
    template: template ? {
      id: template.id,
      name: template.name,
      description: template.description,
      badge_size: template.badge_size,
      orientation: orientation,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      text_color: textColor,
      qr_position: template.qr_position,
      photo_position: template.photo_position,
      expiry_display: template.expiry_display,
      department_display: template.department_display,
      office_display: template.office_display,
      signature_area: template.signature_area,
      layout: template.layout,
    } : null,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Badge Preview</h1>
            <p className="text-sm text-gray-500 mt-1">
              Registration: <span className="font-mono font-semibold">{visit.registration_number}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Visitor Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 flex items-center gap-4">
                  {visitor?.photo_url ? (
                    <img
                      src={visitor.photo_url}
                      alt={visitor.full_name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xl text-gray-500">{(visitor?.full_name || 'V').charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{visitor?.full_name}</p>
                    <p className="text-xs text-gray-500">{visitor?.visitor_organization || 'No organization'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Visitor Type</p>
                  <p className="text-sm font-medium text-gray-900">{visit.visitor_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{visitor?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{visitor?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ID Type</p>
                  <p className="text-sm font-medium text-gray-900">{visitor?.doc_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ID Number</p>
                  <p className="text-sm font-medium text-gray-900">{visitor?.doc_number || '—'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Host Employee</p>
                  <p className="text-sm font-medium text-gray-900">{employee?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium text-gray-900">{employee?.department || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Office Location</p>
                  <p className="text-sm font-medium text-gray-900">{visit.office_location || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Purpose</p>
                  <p className="text-sm font-medium text-gray-900">{visit.purpose || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Visit Date</p>
                  <p className="text-sm font-medium text-gray-900">{visit.visit_date || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Arrival Time</p>
                  <p className="text-sm font-medium text-gray-900">{visit.arrival_time || '—'}</p>
                </div>
                {visit.appointment && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Appointment Date</p>
                      <p className="text-sm font-medium text-gray-900">{visit.appointment.appointment_date || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Appointment Time</p>
                      <p className="text-sm font-medium text-gray-900">{visit.appointment.appointment_time || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Panel</h2>
              <div className="flex items-center gap-2">
                 <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${visit.status === 'pending' ? 'bg-amber-50 text-amber-700' : visit.status === 'approved' ? 'bg-green-50 text-green-700' : visit.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                   {(visit.status || 'unknown').replace('_', ' ').toUpperCase()}
                 </span>
              </div>
            </div>

            <BadgeValidationChecklist visit={visit} />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onApprove}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[52px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve & Generate Badge
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[52px]"
              >
                <X className="h-4 w-4" />
                Reject Visitor
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Badge Preview</h2>
                <div className="flex items-center gap-2">
                  {printError && (
                    <p className="text-xs text-red-600">{printError}</p>
                  )}
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <div style={{ transform: orientation === 'portrait' ? 'rotate(90deg)' : 'none', transformOrigin: 'center' }}>
                  <BadgeLayout badge={previewBadge as VisitorBadge} />
                </div>
              </div>
            </div>

            <BadgePreviewToolbar
              templates={templates}
              selectedTemplate={template}
              orientation={orientation}
              expiryDate={expiryDate}
              expiryTime={expiryTime}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              textColor={textColor}
              onTemplateChange={setTemplate}
              onOrientationChange={setOrientation}
              onExpiryDateChange={setExpiryDate}
              onExpiryTimeChange={setExpiryTime}
              onPrimaryColorChange={setPrimaryColor}
              onSecondaryColorChange={setSecondaryColor}
              onTextColorChange={setTextColor}
            />
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Visitor</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]"
              >
                Cancel
              </button>
              <button
                onClick={() => onReject(rejectReason)}
                disabled={saving || !rejectReason.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[52px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
