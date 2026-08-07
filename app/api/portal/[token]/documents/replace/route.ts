import { NextRequest, NextResponse } from 'next/server'
import { replacePortalDocument } from '@/lib/server/portal'
import { markReplacementUploaded } from '@/lib/server/document-verification'
import { createReceptionistNotification, createSystemNotification } from '@/lib/server/notification-service'

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentId = formData.get('documentId') as string | null

    if (!file || !documentId) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const updated = await replacePortalDocument(documentId, file, visit.visitor.id, visit.id)

    await markReplacementUploaded(documentId)

    createReceptionistNotification(
      'Replacement Uploaded',
      `A replacement document has been uploaded by a visitor and is ready for review.`,
      'info',
      'visitor_document',
      documentId
    ).catch(() => {})

    createSystemNotification(
      'Replacement Uploaded',
      `Your replacement document has been uploaded and is pending review.`,
      'info',
      'visitor_document',
      documentId
    ).catch(() => {})

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Portal replace document error:', err)
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
