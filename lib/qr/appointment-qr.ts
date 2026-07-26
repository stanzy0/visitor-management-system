import QRCode from 'qrcode'

export async function generateAppointmentQR(appointmentId: string): Promise<string> {
  const payload = JSON.stringify({
    type: 'appointment',
    appointmentId,
  })

  const url = await QRCode.toDataURL(payload)
  return url
}

export function appointmentCheckInUrl(appointmentId: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/appointments/checkin?id=${appointmentId}`
}
