'use client'

interface Step7Props {
  visitorType?: string
  full_name?: string
  phone?: string
  email?: string
  visitor_address?: string
  nationality?: string
  gender?: string
  has_vehicle?: boolean
  vehicle_make?: string
  vehicle_model?: string
  vehicle_color?: string
  registration_number?: string
  emergency_contact?: string
  doc_type?: string
  doc_number?: string
  expiry_date?: string
  host_employee_id?: string
  purpose?: string
  custom_purpose?: string
  expected_duration?: number
}

export default function Step7Review({
  visitorType = '',
  full_name = '',
  phone = '',
  email = '',
  visitor_address = '',
  nationality = '',
  gender = '',
  has_vehicle = false,
  vehicle_make = '',
  vehicle_model = '',
  vehicle_color = '',
  registration_number = '',
  emergency_contact = '',
  doc_type = '',
  doc_number = '',
  expiry_date = '',
  host_employee_id = '',
  purpose = '',
  custom_purpose = '',
  expected_duration = 0,
}: Step7Props) {
  const displayPurpose = purpose === 'Other' && custom_purpose ? custom_purpose : purpose
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Review & Confirmation</h3>
      <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
        <p><strong>Type:</strong> {visitorType}</p>
        <p><strong>Name:</strong> {full_name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone:</strong> {phone}</p>
        <p><strong>Address:</strong> {visitor_address || '—'}</p>
        <p><strong>Nationality:</strong> {nationality || '—'}</p>
        <p><strong>Gender:</strong> {gender || '—'}</p>
        <p><strong>Document:</strong> {doc_type} {doc_number ? `• ${doc_number}` : ''} {expiry_date ? `• Exp: ${expiry_date}` : ''}</p>
        <p><strong>Host:</strong> {host_employee_id || '—'}</p>
        <p><strong>Purpose:</strong> {displayPurpose || '—'}</p>
        <p><strong>Duration:</strong> {expected_duration ? `${expected_duration} mins` : '—'}</p>
        <p><strong>Vehicle:</strong> {has_vehicle ? `${vehicle_make} ${vehicle_model} • ${registration_number}` : 'No'}</p>
        <p><strong>Emergency Contact:</strong> {emergency_contact || '—'}</p>
      </div>
    </div>
  )
}
