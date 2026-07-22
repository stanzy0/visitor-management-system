export type BadgeStatus = 'Active' | 'Expired' | 'Checked Out' | 'Cancelled'

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
}

export interface BadgeFormData {
  visit_id: string
  badge_number?: string
  qr_token?: string
  badge_status?: string
  expires_at?: string
}

export interface BadgeStatistics {
  totalIssued: number
  totalPrinted: number
  activeBadges: number
  expiredBadges: number
  checkedOutBadges: number
  cancelledBadges: number
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
