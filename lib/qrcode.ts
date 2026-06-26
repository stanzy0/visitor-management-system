import QRCode from 'qrcode'

export async function generateVisitQRCode(visitId: string): Promise<string> {
  const payload = JSON.stringify({
    visitId,
    type: 'visitor-pass',
    issuedAt: new Date().toISOString(),
  })
  return await QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}