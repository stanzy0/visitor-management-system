import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getIncidentStats } from '@/lib/server/incidents'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['Admin', 'Security', 'Operations', 'Commandant']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await getIncidentStats()

    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('Incident stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
