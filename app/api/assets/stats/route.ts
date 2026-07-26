import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyStatistics } from '@/lib/server/property'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const stats = await getPropertyStatistics()
    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('Property stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch property statistics' }, { status: 500 })
  }
}
