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
    phone?: string | null
    email?: string | null
  } | null
  employee?: {
    full_name: string
    department?: string
    office_location?: string | null
  } | null
  badge?: VisitorBadge | null
  appointment_id?: string | null
  appointment?: {
    id: string
    appointment_date: string
    appointment_time: string
    expected_arrival: string | null
    status?: string
  } | null
}

export interface VisitFormData {
  visitor_id: string
  employee_id: string
  purpose: string
  status?: string
  check_in_time?: string
  check_out_time?: string
}
