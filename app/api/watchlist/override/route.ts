import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { logAuditAction } from '@/lib/server/audit'
import { createWatchlistOverrideNotification } from '@/lib/server/notifications'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitorName } = body

    await createWatchlistOverrideNotification(visitorName || 'Visitor')

    await logAuditAction('Watchlist Override', 'watchlist', null, `Watchlist override approved for ${visitorName || 'Visitor'}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Watchlist override notification error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
