export type IncidentCategory =
  | 'Unauthorized Access'
  | 'Lost Badge'
  | 'Damaged Badge'
  | 'Property Issue'
  | 'Medical Emergency'
  | 'Fire Alarm'
  | 'Evacuation'
  | 'Suspicious Activity'
  | 'Security Alert'
  | 'Watchlist Match'
  | 'Host Complaint'
  | 'Visitor Complaint'
  | 'Technical Issue'
  | 'Other'

export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export type IncidentStatus = 'Open' | 'Assigned' | 'Investigating' | 'Resolved' | 'Closed'

export type IncidentTimelineAction =
  | 'created'
  | 'assigned'
  | 'visitor_contacted'
  | 'host_contacted'
  | 'security_arrived'
  | 'badge_cancelled'
  | 'property_released'
  | 'resolved'
  | 'closed'
  | 'note_added'

export interface IncidentTimelineEntry {
  id: string
  incident_id: string
  action: IncidentTimelineAction
  description: string
  performed_by: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Incident {
  id: string
  incident_number: string
  title: string
  description: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  visitor_id: string | null
  visit_id: string | null
  employee_id: string | null
  reported_by: string | null
  assigned_to: string | null
  location: string | null
  resolved_at: string | null
  resolution: string | null
  attachments: Array<{ url: string; name: string; type: string; size?: number }>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface IncidentFormData {
  title: string
  description: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  visitor_id?: string | null
  visit_id?: string | null
  employee_id?: string | null
  assigned_to?: string | null
  location?: string | null
  resolution?: string | null
  metadata?: Record<string, unknown>
}

export interface IncidentFilters {
  search?: string
  category?: IncidentCategory | 'all'
  severity?: IncidentSeverity | 'all'
  status?: IncidentStatus | 'all'
  dateFrom?: string
  dateTo?: string
  assignedTo?: string
  department?: string
  officer?: string
}

export interface IncidentStats {
  open: number
  critical: number
  resolvedToday: number
  averageResolutionMinutes: number | null
}

export interface IncidentReport {
  total: number
  open: number
  assigned: number
  investigating: number
  resolved: number
  closed: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  averageResolutionMinutes: number | null
  topOfficers: Array<{ assigned_to: string; count: number }>
  trends: Array<{ date: string; count: number }>
}
