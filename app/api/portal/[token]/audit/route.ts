import { NextRequest, NextResponse } from 'next/server'
import { logPortalAudit } from '@/lib/server/portal'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)
    if (!visit) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const body = await request.json()
    const { action, metadata } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    await logPortalAudit(action, visit.id, metadata || {})
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Portal audit error:', err)
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
