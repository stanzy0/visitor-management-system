import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken } from '@/lib/server/portal'
import { collectPortalAnalytics } from '@/lib/analytics/portal-analytics'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    console.error('[Portal API] token:', token)

    let visit = null
    if (token.startsWith('REG-')) {
      visit = await getPortalVisitByRegistrationNumber(token)
    } else {
      visit = await getPortalVisitByQRToken(token)
    }

    console.error('[Portal API] visit found:', !!visit, visit ? { id: visit.id, source: visit.source, status: visit.status, hasVisitor: !!visit.visitor, hasBadge: !!visit.badge, hasEmployee: !!visit.employee } : null)

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
       console.error('[Portal Lookup Failed]', { token, reason: 'visitor_missing', visit_id: visit.id, timestamp: new Date().toISOString() })
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     if (!visit.badge) {
       console.error('[Portal Lookup Failed]', { token, reason: 'badge_missing', visit_id: visit.id, timestamp: new Date().toISOString() })
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     if (!visit.employee) {
       console.error('[Portal Lookup Failed]', { token, reason: 'employee_missing', visit_id: visit.id, timestamp: new Date().toISOString() })
       return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
     }

     console.error('[Portal API] returning success for visit:', visit.id)
     return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal visit fetch error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
