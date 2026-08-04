import QRCode from 'qrcode'
import { getPortalUrl, verifyPortalUrl } from '@/lib/utils/portal-url'

export async function verifyBadgeQR(badgeId: string, qrToken: string): Promise<{ valid: boolean; error: string | null }> {
  try {
    const portalUrl = getPortalUrl(qrToken)

    if (!verifyPortalUrl(portalUrl, qrToken)) {
      return { valid: false, error: 'Generated URL does not match expected format' }
    }

    if (!portalUrl.includes('/portal/')) {
      return { valid: false, error: 'URL does not contain /portal/ path' }
    }

    const encodedToken = encodeURIComponent(qrToken)
    if (!portalUrl.includes(encodedToken)) {
      return { valid: false, error: 'URL does not contain qr_token' }
    }

    const qrDataUrl = await QRCode.toDataURL(portalUrl, { width: 300, margin: 2 })

    if (!qrDataUrl.startsWith('data:image/png;base64,')) {
      return { valid: false, error: 'QR generation failed' }
    }

    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown verification error' }
  }
}
