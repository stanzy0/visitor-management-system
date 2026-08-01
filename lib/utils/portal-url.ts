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

  if (!portalUrl.includes('/portal/') || !portalUrl.includes(qrToken)) {
    const error = `Generated URL does not match expected format: ${portalUrl}`
    console.error('[Portal URL Error]', { error, timestamp: new Date().toISOString() })
    throw new Error(error)
  }

  console.log('[QR Portal URL Generated]', {
    qr_token: qrToken,
    portal_url: portalUrl,
    environment: process.env.NODE_ENV,
    app_url: appUrl,
    timestamp: new Date().toISOString(),
  })

  return portalUrl
}

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
