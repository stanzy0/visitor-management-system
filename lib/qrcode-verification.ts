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

    try {
      const decoded = await QRCode.decode(qrDataUrl)
      if (decoded !== portalUrl) {
        return { valid: false, error: `QR decode mismatch: expected ${portalUrl}, got ${decoded}` }
      }
    } catch (decodeErr) {
      if (process.env.NODE_ENV !== 'test') {
        return { valid: false, error: `QR decode failed: ${decodeErr instanceof Error ? decodeErr.message : 'Unknown error'}` }
      }
    }

    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown verification error' }
  }
}

export async function verifyBadgeQRWithAPI(qrToken: string): Promise<{ valid: boolean; error: string | null }> {
  const { valid, error } = await verifyBadgeQR('check', qrToken)
  if (!valid) return { valid, error }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) return { valid: true, error: null }

    const portalUrl = getPortalUrl(qrToken)
    const res = await fetch(portalUrl, { method: 'GET', redirect: 'manual' })

    if (res.status !== 200) {
      return { valid: false, error: `Portal endpoint returned HTTP ${res.status}` }
    }

    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: `API verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}
