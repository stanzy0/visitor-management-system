export interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string | null
  visitor_address: string | null
  nationality: string | null
  gender: string | null
  vehicle_plate: string | null
  vehicle_type: string | null
  emergency_contact: string | null
  photo_url: string | null
  created_at: string
}

export interface VisitorFormData {
  full_name: string
  email: string
  phone: string
  visitor_organization: string
  visitor_address: string
  nationality: string
  gender: string
  vehicle_plate: string
  vehicle_type: string
  emergency_contact: string
  emergency_relationship?: string
  emergency_phone?: string
  photo_url?: string | null
  host_employee_id?: string
  purpose?: string
  custom_purpose?: string
  expected_duration?: number
  visit_date?: string
  arrival_time?: string
  has_vehicle?: boolean
  registration_number?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_color?: string
  driver_name?: string
  driver_phone?: string
  parking_slot?: string
  notes?: string
  id_number?: string
  id_verification?: boolean
  doc_type?: string
  doc_number?: string
  issuing_country?: string
  expiry_date?: string
  doc_front_image?: File | null
  doc_back_image?: File | null
  doc_front_url?: string
  doc_back_url?: string
  doc_notes?: string
}
