import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken } from '@/lib/server/portal'
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  try {
    const body = await request.json()
    const { registrationNumber, qrToken } = body

    if (!registrationNumber && !qrToken) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    let visit = null
    if (registrationNumber) {
      visit = await getPortalVisitByRegistrationNumber(registrationNumber)
    } else if (qrToken) {
      visit = await getPortalVisitByQRToken(qrToken)
    }

    if (!visit) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal auth error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
