export type VisitLifecycleStatus =
  | 'pending'
  | 'approved'
  | 'documents_verified'
  | 'badge_issued'
  | 'security_cleared'
  | 'checked_in'
  | 'overstayed'
  | 'checked_out'
  | 'rejected'
  | 'cancelled'

export interface PortalVisit {
  id: string
  registration_number: string
  status: VisitLifecycleStatus
  visitor_type: string
  source: string
  rejection_reason: string | null
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  purpose: string | null
  visitor: {
    id: string
    full_name: string
    email: string
    phone: string
    visitor_organization: string | null
    photo_url: string | null
    nationality: string | null
    gender: string | null
  }
  employee: {
    id: string
    full_name: string
    department: string | null
    office_location: string | null
    email: string | null
  } | null
  appointment: {
    id: string
    appointment_date: string
    appointment_time: string | null
    expected_arrival: string | null
    status: string
    purpose: string
  } | null
  badge: {
    id: string
    badge_number: string
    qr_token: string
    issued_at: string | null
    expires_at: string | null
    badge_status: string
  } | null
}

export interface PortalLifecycleEvent {
  id: string
  visit_id: string
  event: string
  from_status: string | null
  to_status: string | null
  performed_by: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface PortalDocument {
  id: string
  visitor_id: string
  document_type: string
  document_number: string
  issuing_country: string | null
  expiry_date: string | null
  front_image_url: string | null
  back_image_url: string | null
  file_name: string | null
  file_url: string | null
  mime_type: string | null
  file_size: number | null
  verification_status: string
  verification_notes: string | null
  verified_by: string | null
  verified_at: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface PortalSecurityAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  message: string
  related_id: string | null
  related_type: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export interface PortalNotification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export interface PortalStats {
  visitorsCurrentlyViewing: number
  qrDownloads: number
  badgeDownloads: number
  documentReplacements: number
}

export const PORTAL_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Approval' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Approved' },
  documents_verified: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Documents Verified' },
  badge_issued: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Badge Ready' },
  security_cleared: { bg: 'bg-green-50', text: 'text-green-700', label: 'Security Cleared' },
  checked_in: { bg: 'bg-green-50', text: 'text-green-700', label: 'Checked In' },
  checked_out: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Checked Out' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Cancelled' },
  overstayed: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Overstayed' },
}

export const LIFECYCLE_STEPS: Array<{ status: VisitLifecycleStatus; label: string }> = [
  { status: 'pending', label: 'Registration Submitted' },
  { status: 'documents_verified', label: 'Documents Verified' },
  { status: 'approved', label: 'Host Approved' },
  { status: 'badge_issued', label: 'Badge Ready' },
  { status: 'security_cleared', label: 'Security Cleared' },
  { status: 'checked_in', label: 'Checked In' },
  { status: 'checked_out', label: 'Checked Out' },
]
