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
  photo_url?: string | null
}
