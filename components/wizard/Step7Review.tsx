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
  emergency_relationship?: string
  doc_type?: string
  doc_number?: string
  expiry_date?: string
  host_employee_id?: string
  host_department?: string | null
  office_location?: string | null
  purpose?: string
  custom_purpose?: string
  expected_duration?: number
  id_verification?: boolean
  photo_url?: string | null
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
  emergency_relationship = '',
  doc_type = '',
  doc_number = '',
  expiry_date = '',
  host_employee_id = '',
  host_department = '',
  office_location = '',
  purpose = '',
  custom_purpose = '',
  expected_duration = 0,
  id_verification = false,
  photo_url = null,
}: Step7Props) {
  const displayPurpose = purpose === 'Other' && custom_purpose ? custom_purpose : purpose
  const vehicleDetails = has_vehicle
    ? [vehicle_make, vehicle_model, vehicle_color, registration_number].filter(Boolean).join(' • ') || 'No'
    : 'No'
  const emergencyDetails = emergency_contact
    ? `${emergency_contact}${emergency_relationship ? ` (${emergency_relationship})` : ''}`
    : '—'
  return (
    <div className="space-y-4 text-gray-900">
      <h3 className="text-lg font-medium text-gray-900">Review & Confirmation</h3>
      <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm text-gray-900">
        <p className="text-gray-900"><strong className="text-gray-700">Type:</strong> <span className="text-gray-900">{visitorType}</span></p>
        {photo_url && (
          <div className="text-gray-900">
            <strong className="text-gray-700">Photo:</strong>
            <div className="mt-2">
              <img src={photo_url} alt={full_name} className="h-24 w-24 rounded-full object-cover border border-gray-200" />
            </div>
          </div>
        )}
        <p className="text-gray-900"><strong className="text-gray-700">Name:</strong> <span className="text-gray-900">{full_name}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Email:</strong> <span className="text-gray-900">{email}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Phone:</strong> <span className="text-gray-900">{phone}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Address:</strong> <span className="text-gray-900">{visitor_address || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Nationality:</strong> <span className="text-gray-900">{nationality || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Gender:</strong> <span className="text-gray-900">{gender || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Document:</strong> <span className="text-gray-900">{id_verification ? 'Not provided' : `${doc_type} ${doc_number ? `• ${doc_number}` : ''} ${expiry_date ? `• Exp: ${expiry_date}` : ''}`}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Host:</strong> <span className="text-gray-900">{host_employee_id || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Host Department:</strong> <span className="text-gray-900">{host_department || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Office Location:</strong> <span className="text-gray-900">{office_location || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Purpose:</strong> <span className="text-gray-900">{displayPurpose || '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Duration:</strong> <span className="text-gray-900">{expected_duration ? `${expected_duration} mins` : '—'}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Vehicle:</strong> <span className="text-gray-900">{vehicleDetails}</span></p>
        <p className="text-gray-900"><strong className="text-gray-700">Emergency Contact:</strong> <span className="text-gray-900">{emergencyDetails}</span></p>
      </div>
    </div>
  )
}
