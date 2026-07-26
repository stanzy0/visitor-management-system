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

export interface LifecycleEvent {
  id: string
  visit_id: string
  event: string
  from_status: string | null
  to_status: string | null
  performed_by: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface MissingDocumentResult {
  visitor_id: string
  missing_count: number
  required_types: string[]
  missing_types: string[]
}

export interface ExpiredVisitResult {
  id: string
  visitor_id: string
  visitor_name: string
  check_in_time: string
  hours_overdue: number
}
