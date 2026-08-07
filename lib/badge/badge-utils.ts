import { getPortalUrl, verifyPortalUrl } from '@/lib/utils/portal-url'
import type { BadgeStatus, BadgePreviewData, VisitorBadge } from './badge-types'
import { BADGE_QR_SETTINGS, BADGE_DATE_FORMAT, BADGE_LAYOUT, BADGE_PDF, BADGE_DEFAULT_EXPIRY_HOURS } from './badge-constants'

export function formatBadgeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', BADGE_DATE_FORMAT as Intl.DateTimeFormatOptions)
  } catch {
    return '—'
  }
}

export function isBadgeExpired(badge: VisitorBadge): boolean {
  if (!badge.expires_at) return false
  return new Date(badge.expires_at) < new Date()
}

export function isBadgeCancelled(badge: VisitorBadge): boolean {
  return badge.badge_status === 'Cancelled'
}

export function getBadgeStatusColor(status: BadgeStatus): string {
  switch (status) {
    case 'Active':
      return '#16a34a'
    case 'Expired':
      return '#dc2626'
    case 'Checked Out':
      return '#6b7280'
    case 'Cancelled':
      return '#b91c1c'
    default:
      return '#4b5563'
  }
}

export function getBadgeStatusCssClass(status: BadgeStatus): string {
  switch (status) {
    case 'Active':
      return 'bg-green-500'
    case 'Expired':
      return 'bg-red-500'
    case 'Checked Out':
      return 'bg-gray-500'
    case 'Cancelled':
      return 'bg-red-700'
    default:
      return 'bg-gray-500'
  }
}

export function buildBadgeQrValue(badge: VisitorBadge): string {
  const portalUrl = getPortalUrl(badge.qr_token)

  if (!verifyPortalUrl(portalUrl, badge.qr_token)) {
    const error = `QR verification failed: generated URL does not match expected pattern for token ${badge.qr_token}`
    console.error('[Badge QR Verification Error]', {
      badge_number: badge.badge_number,
      qr_token: badge.qr_token,
      generated_url: portalUrl,
      error,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
     throw new Error(error)
   }

   return portalUrl
}

export function calculateExpiry(hours: number = BADGE_DEFAULT_EXPIRY_HOURS): Date {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + hours)
  return expiresAt
}

export function buildBadgePreviewData(badge: VisitorBadge): BadgePreviewData {
  return {
    badge,
    qrValue: buildBadgeQrValue(badge),
    formattedIssuedAt: formatBadgeDate(badge.issued_at),
    formattedExpiresAt: formatBadgeDate(badge.expires_at),
    isExpired: isBadgeExpired(badge),
    statusColor: getBadgeStatusColor(badge.badge_status),
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function getVisitorInitial(badge: VisitorBadge): string {
  return (badge.visit?.visitor?.full_name || 'V').charAt(0).toUpperCase()
}

export function getBadgeWatermark(badge: VisitorBadge): string | undefined {
  if (badge.badge_status === 'Expired') return 'EXPIRED'
  if (badge.badge_status === 'Cancelled') return 'CANCELLED'
  return undefined
}

export function sanitizeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function buildBadgePdfFilename(badge: VisitorBadge): string {
  const badgeNumber = sanitizeFilename(badge.badge_number)
  const visitorName = sanitizeFilename(badge.visit?.visitor?.full_name || 'Visitor')
  return `Visitor_Badge_${badgeNumber}_${visitorName}.pdf`
}

export function getBadgeQrSettings() {
  return {
    width: BADGE_QR_SETTINGS.SIZE,
    margin: BADGE_QR_SETTINGS.MARGIN,
    errorCorrectionLevel: BADGE_QR_SETTINGS.ERROR_CORRECTION_LEVEL as 'L' | 'M' | 'Q' | 'H',
  }
}
