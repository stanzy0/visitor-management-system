import jsPDF from 'jspdf'
import type { VisitorBadge } from './badge-types'
import { BADGE_QR_SETTINGS } from './badge-constants'
import { buildBadgeQrValue } from './badge-utils'

export async function generateBadgePdf(badge: VisitorBadge): Promise<void> {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFontSize(20)
  pdf.setTextColor(37, 99, 235)
  pdf.text('VISITOR BADGE', pageWidth / 2, 20, { align: 'center' })

  pdf.setDrawColor(200, 200, 200)
  pdf.line(20, 25, pageWidth - 20, 25)

  pdf.setFontSize(12)
  pdf.setTextColor(60, 60, 60)
  pdf.text(`Badge Number: ${badge.badge_number}`, 20, 35)
  pdf.text(`Status: ${badge.badge_status}`, 20, 42)
  pdf.text(`Issued: ${new Date(badge.issued_at).toLocaleString()}`, 20, 49)
  pdf.text(`Expires: ${new Date(badge.expires_at).toLocaleString()}`, 20, 56)

  if (badge.visit) {
    pdf.text(`Visitor: ${badge.visit.visitor?.full_name || '—'}`, 20, 66)
    pdf.text(`Organization: ${badge.visit.visitor?.visitor_organization || '—'}`, 20, 73)
    pdf.text(`Host: ${badge.visit.employee?.full_name || '—'}`, 20, 80)
    pdf.text(`Department: ${badge.visit.employee?.department || '—'}`, 20, 87)
    pdf.text(`Purpose: ${badge.visit.purpose || '—'}`, 20, 94)
  }

  const qrValue = buildBadgeQrValue(badge)
  const QRCode = await import('qrcode')
  const qrDataUrl = await QRCode.default.toDataURL(qrValue, { width: BADGE_QR_SETTINGS.SIZE, margin: BADGE_QR_SETTINGS.MARGIN })
  pdf.addImage(qrDataUrl, 'PNG', pageWidth - 70, 60, 50, 50)

  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Scan for check-in/out and verification', pageWidth - 45, 115, { align: 'center' })

  pdf.save(`badge-${badge.badge_number}.pdf`)
}
