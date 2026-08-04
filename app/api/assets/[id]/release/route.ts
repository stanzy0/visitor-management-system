import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { releasePropertyItem } from '@/lib/server/property'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { released_to, signature_url } = body

    if (!released_to) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const item = await releasePropertyItem(id, released_to, signature_url, authResult.userEmail)
    return NextResponse.json({ success: true, data: item })
  } catch (err) {
    console.error('Release property item error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
