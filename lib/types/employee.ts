export interface Department {
  id: string
  name: string
  created_at?: string
}

export interface Position {
  id: string
  title: string
  created_at?: string
}

export interface OfficeLocation {
  id: string
  name: string
  building: string | null
  department: string | null
  office_name?: string | null
  display_name?: string | null
  created_at?: string
}

export interface Employee {
  id: string
  full_name: string
  email: string
  phone: string
  department: string
  position: string
  office_location: string
  created_at: string
}

export interface EmployeeFormData {
  full_name: string
  email: string
  phone: string
  department: string
  position: string
  office_location: string
}
