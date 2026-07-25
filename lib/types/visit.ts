import type { VisitorBadge } from '@/lib/badge/badge-types'

export interface Visit {
  id: string
  visitor_id: string
  employee_id: string
  purpose: string
  status: string
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor?: {
    full_name: string
    visitor_organization: string
    photo_url?: string | null
  } | null
  employee?: {
    full_name: string
    department?: string
  } | null
  badge?: VisitorBadge | null
}

export interface VisitFormData {
  visitor_id: string
  employee_id: string
  purpose: string
  status?: string
  check_in_time?: string
  check_out_time?: string
}
