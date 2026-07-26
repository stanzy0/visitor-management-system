export type BadgeStatus = 'Active' | 'Expired' | 'Checked Out' | 'Cancelled' | 'Revoked'

export interface BadgeVisit {
  id: string
  visitor: {
    full_name: string
    visitor_organization: string
    photo_url?: string | null
  } | null
  employee: {
    full_name: string
    department: string
  } | null
  purpose: string
  check_in_time: string | null
  check_out_time: string | null
}

export interface VisitorBadge {
  id: string
  visit_id: string
  badge_number: string
  qr_token: string
  badge_status: BadgeStatus
  issued_at: string
  expires_at: string
  printed_at: string | null
  printed_by: string | null
  reprint_count: number
  created_at: string
  updated_at: string
  visit: BadgeVisit | null
  template_id?: string | null
  printer_id?: string | null
  revoked?: boolean
  revoked_at?: string | null
  revoked_by?: string | null
  revoked_reason?: string | null
  template?: {
    id: string
    name: string
    description?: string | null
    badge_size: string
    orientation: string
    primary_color: string
    secondary_color: string
    text_color: string
    qr_position: string
    photo_position: string
    expiry_display: boolean
    department_display: boolean
    office_display: boolean
    signature_area: boolean
    layout: any[]
  } | null
  printer?: {
    id: string
    name: string
    printer_type: string
    paper_size: string
    orientation: string
    margins: any
    copies: number
    is_default: boolean
  } | null
}

export interface BadgeFormData {
  visit_id: string
  badge_number?: string
  qr_token?: string
  badge_status?: string
  expires_at?: string
  template_id?: string
  printer_id?: string
}

export interface BadgeStatistics {
  totalIssued: number
  totalPrinted: number
  activeBadges: number
  expiredBadges: number
  checkedOutBadges: number
  cancelledBadges: number
  revokedBadges: number
  reprints: number
  byDepartment: Array<{ name: string; count: number }>
}

export interface BadgePreviewData {
  badge: VisitorBadge
  qrValue: string
  formattedIssuedAt: string
  formattedExpiresAt: string
  isExpired: boolean
  statusColor: string
}

export interface BadgeTemplate {
  id: string
  name: string
  description?: string | null
  badge_size: string
  orientation: string
  background_image?: string | null
  logo_url?: string | null
  primary_color: string
  secondary_color: string
  text_color: string
  qr_position: string
  photo_position: string
  expiry_display: boolean
  department_display: boolean
  office_display: boolean
  signature_area: boolean
  layout: any[]
  is_default: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface Printer {
  id: string
  name: string
  printer_type: string
  paper_size: string
  orientation: string
  margins: any
  copies: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface BadgeHistoryRecord {
  id: string
  badge_id: string
  action: string
  performed_by?: string | null
  reason?: string | null
  printer_name?: string | null
  template_name?: string | null
  metadata?: any
  created_at: string
}
