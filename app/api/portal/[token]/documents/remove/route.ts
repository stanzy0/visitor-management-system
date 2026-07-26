import { NextRequest, NextResponse } from 'next/server'
import { removePortalDocument } from '@/lib/server/portal'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)
    if (!visit) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (visit.status !== 'pending') {
      return NextResponse.json({ error: 'Documents can only be removed while visit is pending' }, { status: 400 })
    }

    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    await removePortalDocument(documentId, visit.visitor.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Portal remove document error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

async function resolveVisit(token: string): Promise<{ id: string; visitor: { id: string }; status: string } | null> {
  if (token.startsWith('REG-')) {
    const { getPortalVisitByRegistrationNumber } = await import('@/lib/server/portal')
    return getPortalVisitByRegistrationNumber(token)
  }
  const { getPortalVisitByQRToken } = await import('@/lib/server/portal')
  return getPortalVisitByQRToken(token)
}
