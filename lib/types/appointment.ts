export type AppointmentStatus =
  | 'Scheduled'
  | 'Arrived'
  | 'Checked In'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'

export interface Appointment {
  id: string
  appointment_number: string
  visitor_id: string
  employee_id: string
  office_location: string
  appointment_date: string
  appointment_time: string
  expected_duration: number
  purpose: string
  status: AppointmentStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  qr_code: string | null
  visitor?: {
    full_name: string
    email: string
    phone: string
    visitor_organization: string | null
    photo_url: string | null
  } | null
  employee?: {
    full_name: string
    department: string
    office_location: string
  } | null
}

export interface AppointmentFormData {
  visitor_id: string
  employee_id: string
  office_location: string
  appointment_date: string
  appointment_time: string
  expected_duration: number
  purpose: string
  notes?: string | null
}

export interface AppointmentStats {
  todayTotal: number
  arrived: number
  checkedIn: number
  completedToday: number
  noShows: number
  upcomingToday: number
}

export interface AppointmentReport {
  completionRate: number
  noShows: number
  averageWaitingMinutes: number
  peakHours: { hour: string; count: number }[]
  byDepartment: { department: string; count: number }[]
}
