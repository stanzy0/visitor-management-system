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
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const events = await getPortalLifecycleEvents(visit.id)
    return NextResponse.json({ success: true, data: events })
  } catch (err) {
    console.error('Portal lifecycle error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
