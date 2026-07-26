import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { confiscatePropertyItem, addPropertyHistory } from '@/lib/server/property'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { reason, expected_release_at } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required for confiscation' }, { status: 400 })
    }

    const item = await confiscatePropertyItem(id, reason, authResult.userEmail || 'system', expected_release_at)
    return NextResponse.json({ success: true, data: item })
  } catch (err) {
    console.error('Confiscate property item error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to confiscate property item' }, { status: 500 })
  }
}
