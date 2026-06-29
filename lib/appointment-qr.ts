import QRCode from 'qrcode'

export async function generateAppointmentQRCode(appointmentId: string, visitId: string): Promise<string> {
  const payload = JSON.stringify({
    type: 'appointment',
    appointmentId,
    visitId,
  })
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating appointment QR code:', error)
    throw error
  }
}