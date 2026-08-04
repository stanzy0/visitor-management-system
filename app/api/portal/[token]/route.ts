import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken } from '@/lib/server/portal'
import { collectPortalAnalytics } from '@/lib/analytics/portal-analytics'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    let visit = null
    if (token.startsWith('REG-')) {
      visit = await getPortalVisitByRegistrationNumber(token)
    } else {
      visit = await getPortalVisitByQRToken(token)
    }

    if (!visit) {
      console.error('[Portal Lookup Failed]', {
        token,
        token_type: token.startsWith('REG-') ? 'registration_number' : 'qr_token',
        reason: 'visit_not_found',
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

      if (!visit.visitor) {
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     if (!visit.badge) {
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     if (!visit.employee) {
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal visit fetch error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
