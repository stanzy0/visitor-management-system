export interface HostDashboardStats {
  visitorsExpectedToday: number
  pendingApprovals: number
  currentVisitors: number
  upcomingAppointments: number
  monthlyVisitors: number
  invitationsSent: number
}

export interface HostReport {
  monthlyVisitors: number
  frequentVisitors: Array<{ visitor_name: string; visit_count: number }>
  pendingVisitors: number
  visitorHistory: Array<{
    id: string
    visitor_name: string
    purpose: string
    status: string
    check_in_time: string | null
    check_out_time: string | null
    created_at: string
  }>
}

export interface EmployeeProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  department: string
  office_location: string
  office_extension: string | null
  availability: string | null
}
