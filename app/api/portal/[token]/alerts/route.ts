import { NextRequest, NextResponse } from 'next/server'
import { getPortalSecurityAlerts } from '@/lib/server/portal'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)
    if (!visit) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const alerts = await getPortalSecurityAlerts(visit.id)
    return NextResponse.json({ success: true, data: alerts })
  } catch (err) {
    console.error('Portal alerts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function resolveVisit(token: string): Promise<{ id: string } | null> {
  if (token.startsWith('REG-')) {
    const { getPortalVisitByRegistrationNumber } = await import('@/lib/server/portal')
    return getPortalVisitByRegistrationNumber(token)
  }
  const { getPortalVisitByQRToken } = await import('@/lib/server/portal')
  return getPortalVisitByQRToken(token)
}
