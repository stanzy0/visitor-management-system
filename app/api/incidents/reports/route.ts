import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getIncidentReport } from '@/lib/server/incidents'

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

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const report = await getIncidentReport(start && end ? { start, end } : undefined)

    return NextResponse.json({ success: true, data: report })
  } catch (err) {
    console.error('Incident report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
