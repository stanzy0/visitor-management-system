export type DocumentVerificationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Replacement Requested' | 'Reuploaded'

export interface DocumentVerification {
  id: string
  visitor_id: string
  visit_id: string | null
  document_type: string
  document_url: string
  status: DocumentVerificationStatus
  approved_by: string | null
  approved_at: string | null
  rejected_reason: string | null
  replacement_requested: boolean
  replacement_uploaded: boolean
  created_at: string
  updated_at: string
  visitor?: {
    full_name: string
    email: string
    visitor_organization: string | null
    photo_url: string | null
  }
  visit?: {
    id: string
    status: string
    employee: {
      full_name: string
      department: string | null
    } | null
  }
}

export interface DocumentVerificationFilters {
  search: string
  document_type: string
  status: string
  date_from: string
  date_to: string
}

export interface DocumentVerificationStats {
  pending: number
  approved: number
  rejected: number
  replacement_requested: number
  reuploaded: number
  total: number
  today_reviews: number
}

export interface VerificationHistoryEntry {
  action: string
  performed_by: string | null
  performed_at: string
  notes?: string
  reason?: string
}
