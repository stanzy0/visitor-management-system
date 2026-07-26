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
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    console.error('Portal visit fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
