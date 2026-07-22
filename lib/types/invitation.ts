export interface VisitorInvitation {
  id: string
  invitation_token: string
  host_employee_id: string
  visitor_email: string
  visitor_name: string
  visitor_phone?: string
  visitor_organization?: string
  purpose: string
  expected_date: string
  expected_time?: string
  vehicle_required: boolean
  number_of_visitors: number
  notes?: string
  status: 'Pending' | 'Completed' | 'Expired' | 'Cancelled' | 'Approved' | 'Rejected'
  expires_at: string
  registration_completed_at?: string
  appointment_id?: string
  badge_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  host?: {
    full_name: string
    department?: string
    email?: string
  }
  badge?: {
    id: string
    badge_number: string
    badge_status: string
    issued_at: string
    expires_at: string
    qr_token: string
  } | null
}

export interface InvitationFormData {
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  visitor_organization: string
  purpose: string
  expected_date: string
  expected_time: string
  vehicle_required: boolean
  number_of_visitors: number
  notes: string
}
