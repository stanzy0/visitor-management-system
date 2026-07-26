export function generateICS(appointment: {
  appointment_number: string
  appointment_date: string
  appointment_time: string
  expected_duration: number
  purpose: string
  visitor?: { full_name: string } | null
  employee?: { full_name: string; department: string } | null
  office_location: string
}) {
  const start = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const end = new Date(start.getTime() + appointment.expected_duration * 60 * 1000)

  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Visitor Management//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.appointment_number}@vms`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:Appointment ${appointment.appointment_number}`,
    `DESCRIPTION:${appointment.purpose}`,
    `LOCATION:${appointment.office_location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return ics
}

export function downloadICS(ics: string, filename: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
