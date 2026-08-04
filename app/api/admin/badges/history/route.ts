import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getBadgeHistory, addBadgeHistoryRecord } from '@/lib/server/badges'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const badgeId = searchParams.get('badgeId') || undefined

    const history = await getBadgeHistory(badgeId)
    return NextResponse.json({ success: true, data: history })
  } catch (err) {
    console.error('Fetch badge history error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const record = await addBadgeHistoryRecord(body)
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (err) {
    console.error('Add badge history error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
