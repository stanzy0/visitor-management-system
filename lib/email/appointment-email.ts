export function buildAppointmentConfirmationEmail({
  appointment,
  qrDataUrl,
}: {
  appointment: {
    appointment_number: string
    appointment_date: string
    appointment_time: string
    purpose: string
    office_location: string
    notes: string | null
    visitor?: { full_name: string; visitor_organization: string | null } | null
    employee?: { full_name: string; department: string } | null
  }
  qrDataUrl?: string
}) {
  const subject = `Appointment Confirmation - ${appointment.appointment_number}`

  const body = `
<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; color: #111;">
  <h2>Appointment Confirmation</h2>
  <p><strong>Appointment Number:</strong> ${appointment.appointment_number}</p>
  <p><strong>Visitor:</strong> ${appointment.visitor?.full_name || ''}</p>
  <p><strong>Host:</strong> ${appointment.employee?.full_name || ''} - ${appointment.employee?.department || ''}</p>
  <p><strong>Office Location:</strong> ${appointment.office_location}</p>
  <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
  <p><strong>Time:</strong> ${appointment.appointment_time}</p>
  <p><strong>Purpose:</strong> ${appointment.purpose}</p>
  ${qrDataUrl ? `<p><img src="${qrDataUrl}" alt="QR Code" /></p>` : ''}
  <p><strong>Security Instructions:</strong> Please arrive 10 minutes early and bring a valid ID.</p>
  ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
</body>
</html>
`.trim()

  return { subject, body }
}
