export interface VisitorDocument {
  id: string
  visitor_id: string
  document_type: DocumentType
  document_number: string
  issuing_country: string | null
  expiry_date: string | null
  front_image_url: string | null
  back_image_url: string | null
  file_name: string | null
  file_url: string | null
  mime_type: string | null
  file_size: number | null
  verification_status: VerificationStatus
  verification_notes: string | null
  verified_by: string | null
  verified_at: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
  visitor?: {
    full_name: string
    email: string
  }
}

export type DocumentType =
  | 'National Identity Card'
  | 'International Passport'
  | 'Driver\'s License'
  | 'Military Identity Card'
  | 'Staff Identity Card'
  | 'Invitation Letter'
  | 'Approval Letter'
  | 'Vehicle Permit'
  | 'Security Clearance'
  | 'Other'

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected'

export const DOCUMENT_TYPES: DocumentType[] = [
  'National Identity Card',
  'International Passport',
  'Driver\'s License',
  'Military Identity Card',
  'Staff Identity Card',
  'Invitation Letter',
  'Approval Letter',
  'Vehicle Permit',
  'Security Clearance',
  'Other',
]

export const VERIFICATION_STATUSES: VerificationStatus[] = ['Pending', 'Verified', 'Rejected']

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf']
export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function isImageMimeType(mimeType: string | null | undefined): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType || '')
}

export function isPdfMimeType(mimeType: string | null | undefined): boolean {
  return mimeType === 'application/pdf'
}

export function getVerificationStatusColor(
  status: VerificationStatus
): 'green' | 'amber' | 'red' {
  switch (status) {
    case 'Verified':
      return 'green'
    case 'Pending':
      return 'amber'
    case 'Rejected':
      return 'red'
  }
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}
