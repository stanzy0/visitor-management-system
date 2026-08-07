const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export function validateEnvVars(): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  return { valid: missing.length === 0, missing }
}

export function getPortalUrl(qrToken: string): string {
  if (!qrToken) {
    throw new Error('QR token is required to generate portal URL')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    const error = 'NEXT_PUBLIC_APP_URL is not configured'
    console.error('[Portal URL Error]', { error, timestamp: new Date().toISOString() })
    throw new Error(error)
  }

  if (process.env.NODE_ENV === 'production' && appUrl.includes('localhost')) {
    const error = `NEXT_PUBLIC_APP_URL contains localhost in production: ${appUrl}`
    console.error('[Portal URL Error]', { error, timestamp: new Date().toISOString() })
    throw new Error(error)
  }

  if (process.env.NODE_ENV === 'production' && !appUrl.startsWith('https://')) {
    const error = `NEXT_PUBLIC_APP_URL must use HTTPS in production: ${appUrl}`
    console.error('[Portal URL Error]', { error, timestamp: new Date().toISOString() })
    throw new Error(error)
  }

  const encodedToken = encodeURIComponent(qrToken)
  const portalUrl = `${appUrl}/portal/${encodedToken}`

    if (!portalUrl.includes('/portal/') || !portalUrl.includes(encodedToken)) {
     const error = `Generated URL does not match expected format: ${portalUrl}`
     console.error('[Portal URL Error]', { error, timestamp: new Date().toISOString() })
     throw new Error(error)
   }

   return portalUrl
 }

export const buildPortalQrUrl = getPortalUrl

export function verifyPortalUrl(url: string, qrToken: string): boolean {
  try {
    const expected = getPortalUrl(qrToken)
    return url === expected
  } catch {
    return false
  }
}

export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  }
  if (process.env.NODE_ENV === 'production' && appUrl.includes('localhost')) {
    throw new Error(`NEXT_PUBLIC_APP_URL contains localhost in production: ${appUrl}`)
  }
  if (process.env.NODE_ENV === 'production' && !appUrl.startsWith('https://')) {
    throw new Error(`NEXT_PUBLIC_APP_URL must use HTTPS in production: ${appUrl}`)
  }
  return appUrl
}
