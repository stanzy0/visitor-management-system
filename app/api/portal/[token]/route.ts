import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken } from '@/lib/server/portal'

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
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    if (!visit.visitor) {
      console.warn('[Portal Lookup]', {
        token,
        visit_id: visit.id,
        registration_number: visit.registration_number,
        reason: 'visitor_missing',
        timestamp: new Date().toISOString(),
      })
    }

    if (!visit.badge) {
      console.warn('[Portal Lookup]', {
        token,
        visit_id: visit.id,
        registration_number: visit.registration_number,
        reason: 'badge_missing',
        timestamp: new Date().toISOString(),
      })
    }

    if (!visit.employee) {
      console.warn('[Portal Lookup]', {
        token,
        visit_id: visit.id,
        registration_number: visit.registration_number,
        reason: 'employee_missing',
        timestamp: new Date().toISOString(),
      })
    }

    console.log('[Portal Opened]', {
      token,
      visit_id: visit.id,
      registration_number: visit.registration_number,
      status: visit.status,
      has_visitor: !!visit.visitor,
      has_badge: !!visit.badge,
      has_employee: !!visit.employee,
      has_appointment: !!visit.appointment,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal visit fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
