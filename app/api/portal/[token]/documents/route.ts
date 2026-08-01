import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)

    if (!visit) {
      console.error('[Portal Documents Lookup Failed]', { token, reason: 'visit_not_found', timestamp: new Date().toISOString() })
      return NextResponse.json({ success: true, data: [] })
    }

    if (!visit.visitor?.id) {
      console.error('[Portal Documents Lookup]', { token, reason: 'visitor_missing', visit_id: visit.id, timestamp: new Date().toISOString() })
      return NextResponse.json({ success: true, data: [] })
    }

    const { getPortalDocuments } = await import('@/lib/server/portal')
    const documents = await getPortalDocuments(visit.visitor.id)
    return NextResponse.json({ success: true, data: documents })
  } catch (err) {
    console.error('Portal documents error:', err)
    return NextResponse.json({ success: true, data: [] })
  }
}

async function resolveVisit(token: string): Promise<{ id: string; visitor: { id: string } } | null> {
  if (token.startsWith('REG-')) {
    const { getPortalVisitByRegistrationNumber } = await import('@/lib/server/portal')
    return getPortalVisitByRegistrationNumber(token)
  }
  const { getPortalVisitByQRToken } = await import('@/lib/server/portal')
  return getPortalVisitByQRToken(token)
}
