import { NextRequest, NextResponse } from 'next/server'
import { replacePortalDocument } from '@/lib/server/portal'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const visit = await resolveVisit(token)
    if (!visit) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (visit.status !== 'pending') {
      return NextResponse.json({ error: 'Documents can only be replaced while visit is pending' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentId = formData.get('documentId') as string | null

    if (!file || !documentId) {
      return NextResponse.json({ error: 'File and documentId are required' }, { status: 400 })
    }

    const updated = await replacePortalDocument(documentId, file, visit.visitor.id, visit.id)
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Portal replace document error:', err)
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
