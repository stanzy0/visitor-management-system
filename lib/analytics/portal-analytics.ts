import { buildPortalQrUrl } from '@/lib/utils/portal-url'

export async function hashIp(ip: string): Promise<string> {
  if (!ip || ip === 'unknown') return 'unknown'
  try {
    const data = new TextEncoder().encode(ip + process.env.IP_HASH_SALT || 'visitor-mgmt-salt')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
  } catch {
    return 'unknown'
  }
}

export function detectBrowser(userAgent: string): string {
  if (!userAgent) return 'unknown'

  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer'
  return 'Other'
}

export function detectDeviceType(userAgent: string): 'Mobile' | 'Tablet' | 'Desktop' {
  if (!userAgent) return 'Desktop'

  const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet|Kindle|PlayBook/i.test(userAgent)

  if (isTablet) return 'Tablet'
  if (isMobile) return 'Mobile'
  return 'Desktop'
}

export function detectOS(userAgent: string): string {
  if (!userAgent) return 'unknown'

  if (userAgent.includes('Win')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) return 'iOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Other'
}

export interface PortalAnalyticsData {
  registrationNumber: string | null
  badgeNumber: string | null
  visitorId: string | null
  qrToken: string | null
  portalUrl: string | null
  browser: string
  deviceType: 'Mobile' | 'Tablet' | 'Desktop'
  operatingSystem: string
  userAgent: string | null
  hashedIp: string
  environment: string
  timestamp: string
}

export async function collectPortalAnalytics(
  request: Request,
  token: string,
  visit: {
    id: string
    registration_number: string
    visitor?: { id: string } | null
    badge?: { badge_number: string; qr_token: string } | null
    employee?: { id: string } | null
  }
): Promise<PortalAnalyticsData> {
  const userAgent = request.headers.get('user-agent')
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  let rawIp = 'unknown'
  if (forwardedFor) {
    rawIp = forwardedFor.split(',')[0].trim()
  } else if (realIp) {
    rawIp = realIp
  }

  const hashedIp = await hashIp(rawIp)

  let portalUrl: string | null = null
  try {
    if (visit.badge?.qr_token && !token.startsWith('REG-')) {
      portalUrl = buildPortalQrUrl(visit.badge.qr_token)
    }
  } catch {
    portalUrl = null
  }

  return {
    registrationNumber: visit.registration_number,
    badgeNumber: visit.badge?.badge_number || null,
    visitorId: visit.visitor?.id || null,
    qrToken: visit.badge?.qr_token || null,
    portalUrl,
    browser: detectBrowser(userAgent || ''),
    deviceType: detectDeviceType(userAgent || ''),
    operatingSystem: detectOS(userAgent || ''),
    userAgent,
    hashedIp,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  }
}
