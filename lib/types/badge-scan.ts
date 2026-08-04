export type VerificationResult = 'VALID' | 'INVALID' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | 'UNKNOWN'

export interface BadgeScanLog {
  id: string
  badge_id: string
  visit_id: string
  qr_token: string
  scanned_at: string
  scanned_by: string | null
  scanner_name: string | null
  device_name: string | null
  ip_address: string | null
  user_agent: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  verification_result: VerificationResult
  created_at: string
}

export interface BadgeVerificationRequest {
  qr_token: string
  scanner_name?: string | null
  device_name?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface BadgeVerificationResponse {
  valid: boolean
  duplicate?: boolean
  status: VerificationResult
  badge?: {
    id: string
    badge_number: string
    badge_status: string
    issued_at: string
    expires_at: string
  }
  visitor?: {
    id: string
    full_name: string
    visitor_organization: string | null
    photo_url: string | null
  }
  visit?: {
    id: string
    registration_number: string
    status: string
    purpose: string
    check_in_time: string | null
    check_out_time: string | null
  }
  employee?: {
    full_name: string
    department: string
    office_location: string | null
  } | null
  message?: string
  last_scanned_at?: string
}

export interface ScanHistoryFilters {
  badge_id?: string
  qr_token?: string
  verification_result?: VerificationResult
  date_from?: string
  date_to?: string
  scanner_name?: string
  page?: number
  limit?: number
}

export interface ScanHistoryResponse {
  data: BadgeScanLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}
