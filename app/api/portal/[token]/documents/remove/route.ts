import { NextRequest, NextResponse } from 'next/server'
import { removePortalDocument } from '@/lib/server/portal'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)
    if (!visit) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (visit.status !== 'pending') {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    await removePortalDocument(documentId, visit.visitor.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Portal remove document error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
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
