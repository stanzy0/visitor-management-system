export type PropertyStatus = 'Pending Entry' | 'Inside' | 'Released' | 'Confiscated' | 'Lost' | 'Damaged'

export interface PropertyItem {
  id: string
  property_number: string
  visit_id: string
  visitor_id: string
  employee_id: string
  name: string
  category: string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  color?: string | null
  quantity: number
  condition: string
  photo_url?: string | null
  remarks?: string | null
  status: PropertyStatus
  confiscated: boolean
  confiscated_at?: string | null
  confiscated_by?: string | null
  confiscated_reason?: string | null
  expected_release_at?: string | null
  released_at?: string | null
  released_by?: string | null
  released_to?: string | null
  signature_url?: string | null
  qr_token: string
  created_by?: string | null
  created_at: string
  updated_at: string
  visitor?: {
    full_name: string
    visitor_organization: string
    photo_url?: string | null
  } | null
  employee?: {
    full_name: string
    department?: string
  } | null
  visit?: {
    id: string
    status: string
    check_in_time?: string | null
    check_out_time?: string | null
  } | null
}

export interface PropertyFormData {
  visit_id: string
  visitor_id: string
  employee_id: string
  name: string
  category: string
  brand?: string
  model?: string
  serial_number?: string
  color?: string
  quantity: number
  condition: string
  photo_url?: string
  remarks?: string
  status?: PropertyStatus
  confiscated?: boolean
  confiscated_reason?: string
  expected_release_at?: string
  released_to?: string
  signature_url?: string
}

export interface PropertyHistoryRecord {
  id: string
  property_id: string
  action: string
  old_status?: string | null
  new_status?: string | null
  performed_by?: string | null
  reason?: string | null
  metadata?: any
  created_at: string
}

export interface PropertyStatistics {
  totalItems: number
  itemsInside: number
  confiscatedItems: number
  pendingRelease: number
  releasedToday: number
  lostItems: number
  damagedItems: number
  byCategory: Array<{ category: string; count: number }>
}

export const PROPERTY_CATEGORIES = [
  'Laptop',
  'Phone',
  'Tablet',
  'USB Drive',
  'Camera',
  'Drone',
  'Hard Disk',
  'Projector',
  'Suitcase',
  'Backpack',
  'Toolbox',
  'Weapon',
  'Other',
] as const

export const PROPERTY_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'] as const
