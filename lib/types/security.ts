export type WatchlistSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface WatchlistEntry {
  id: string
  full_name: string
  photo_url: string | null
  reason: string
  severity: WatchlistSeverity
  document_number: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WatchlistFormData {
  full_name: string
  reason: string
  severity: WatchlistSeverity
  document_number?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean
}

export type SecurityAlertType =
  | 'Badge Expired'
  | 'Watchlist Match'
  | 'Visitor Overstayed'
  | 'Appointment Cancelled'
  | 'Invalid QR'
  | 'Duplicate Check-In'
  | 'Host Not Available'

export type SecurityAlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface SecurityAlert {
  id: string
  alert_type: SecurityAlertType
  severity: SecurityAlertSeverity
  title: string
  message: string
  related_id: string | null
  related_type: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export type GateActivityType = 'entry_attempt' | 'exit_attempt' | 'vehicle_entry' | 'vehicle_exit'
export type GateDirection = 'in' | 'out'
export type GateDecision = 'approved' | 'denied' | 'hold'

export interface GateActivity {
  id: string
  visitor_id: string
  visit_id: string | null
  badge_id: string | null
  activity_type: GateActivityType
  direction: GateDirection
  gate: string | null
  verified_by: string | null
  verification_method: string | null
  decision: GateDecision | null
  denial_reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SecurityDecision {
  id: string
  visitor_id: string
  visit_id: string | null
  decision: GateDecision
  reason: string | null
  decided_by: string | null
  created_at: string
}

export interface SecurityDashboardStats {
  visitorsWaitingAtGate: number
  visitorsCleared: number
  visitorsDenied: number
  visitorsCurrentlyInside: number
  expiredBadges: number
  vehiclesInside: number
  visitorsDueToExit: number
  watchlistMatches: number
}

export type DenialReason =
  | 'Invalid ID'
  | 'Expired Badge'
  | 'Watchlist Match'
  | 'Host Unavailable'
  | 'Appointment Cancelled'
  | 'Other'
