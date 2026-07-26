import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken } from '@/lib/server/portal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationNumber, qrToken } = body

    if (!registrationNumber && !qrToken) {
      return NextResponse.json({ error: 'Registration number or QR token is required' }, { status: 400 })
    }

    let visit = null
    if (registrationNumber) {
      visit = await getPortalVisitByRegistrationNumber(registrationNumber)
    } else if (qrToken) {
      visit = await getPortalVisitByQRToken(qrToken)
    }

    if (!visit) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal auth error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
