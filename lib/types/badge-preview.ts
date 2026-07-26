export type BadgeTemplateType = 'Standard Visitor' | 'Contractor' | 'VIP' | 'Vendor' | 'Guest Lecturer'

export interface BadgePreviewVisitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string | null
  visitor_address: string | null
  nationality: string | null
  gender: string | null
  photo_url: string | null
  doc_type: string | null
  doc_number: string | null
  issuing_country: string | null
  expiry_date: string | null
  doc_front_url: string | null
  doc_back_url: string | null
  emergency_contact: string | null
  vehicle_plate: string | null
  vehicle_type: string | null
}

export interface BadgePreviewEmployee {
  id: string
  full_name: string
  department: string | null
  office_location: string | null
  phone_extension: string | null
  email: string | null
}

export interface BadgePreviewVisit {
  id: string
  registration_number: string
  status: string
  visitor_type: string
  source: string
  purpose: string
  visit_date: string
  arrival_time: string | null
  expected_duration: number
  office_location: string | null
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  rejection_reason: string | null
  visitor: BadgePreviewVisitor | null
  employee: BadgePreviewEmployee | null
  appointment: {
    id: string
    appointment_date: string
    appointment_time: string | null
    expected_arrival: string | null
    status: string
  } | null
}

export interface BadgeTemplateOption {
  id: string
  name: string
  description?: string | null
  badge_size: string
  orientation: string
  primary_color: string
  secondary_color: string
  text_color: string
  qr_position: string
  photo_position: string
  expiry_display: boolean
  department_display: boolean
  office_display: boolean
  signature_area: boolean
  layout: any[]
  is_default: boolean
}

export interface BadgePreviewState {
  visit: BadgePreviewVisit | null
  template: BadgeTemplateOption | null
  orientation: 'portrait' | 'landscape'
  expiryDate: string
  expiryTime: string
  primaryColor: string
  secondaryColor: string
  textColor: string
  loading: boolean
  error: string | null
  saving: boolean
}

export interface BadgeValidationResult {
  isValid: boolean
  missingItems: string[]
}

export const DEFAULT_BADGE_TEMPLATES: BadgeTemplateOption[] = [
  {
    id: 'standard',
    name: 'Standard Visitor',
    description: 'Default visitor badge template',
    badge_size: 'standard',
    orientation: 'landscape',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    text_color: '#1f2937',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: false,
    layout: [],
    is_default: true,
  },
  {
    id: 'contractor',
    name: 'Contractor',
    description: 'Badge for contract workers',
    badge_size: 'standard',
    orientation: 'landscape',
    primary_color: '#d97706',
    secondary_color: '#92400e',
    text_color: '#1f2937',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: true,
    layout: [],
    is_default: false,
  },
  {
    id: 'vip',
    name: 'VIP',
    description: 'VIP visitor badge',
    badge_size: 'standard',
    orientation: 'landscape',
    primary_color: '#7c3aed',
    secondary_color: '#5b21b6',
    text_color: '#1f2937',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: false,
    layout: [],
    is_default: false,
  },
  {
    id: 'vendor',
    name: 'Vendor',
    description: 'Vendor/supplier badge',
    badge_size: 'standard',
    orientation: 'landscape',
    primary_color: '#059669',
    secondary_color: '#047857',
    text_color: '#1f2937',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: true,
    layout: [],
    is_default: false,
  },
  {
    id: 'guest-lecturer',
    name: 'Guest Lecturer',
    description: 'Guest lecturer/academic visitor badge',
    badge_size: 'standard',
    orientation: 'landscape',
    primary_color: '#dc2626',
    secondary_color: '#b91c1c',
    text_color: '#1f2937',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: false,
    layout: [],
    is_default: false,
  },
]
