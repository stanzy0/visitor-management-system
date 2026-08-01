import { NextRequest, NextResponse } from 'next/server'
import { getPortalVisitByRegistrationNumber, getPortalVisitByQRToken, getPortalLifecycleEvents } from '@/lib/server/portal'

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
      console.error('[Portal Lifecycle Lookup Failed]', { token, reason: 'visit_not_found', timestamp: new Date().toISOString() })
      return NextResponse.json({ success: true, data: [] })
    }

    if (!visit.id) {
      console.error('[Portal Lifecycle Lookup]', { token, reason: 'visit_id_missing', timestamp: new Date().toISOString() })
      return NextResponse.json({ success: true, data: [] })
    }

    const events = await getPortalLifecycleEvents(visit.id)
    return NextResponse.json({ success: true, data: events })
  } catch (err) {
    console.error('Portal lifecycle error:', err)
    return NextResponse.json({ success: true, data: [] })
  }
}
