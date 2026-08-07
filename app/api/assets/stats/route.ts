import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyStatistics } from '@/lib/server/property'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
  }

  try {
    const stats = await getPropertyStatistics()
    const data = {
      totalItems: stats.totalItems || 0,
      itemsInside: stats.itemsInside || 0,
      confiscatedItems: stats.confiscatedItems || 0,
      pendingRelease: stats.pendingRelease || 0,
      releasedToday: stats.releasedToday || 0,
      lostItems: stats.lostItems || 0,
      damagedItems: stats.damagedItems || 0,
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Property stats error:', err)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
