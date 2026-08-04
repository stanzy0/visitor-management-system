import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getHostDashboardStats } from '@/lib/server/host'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const stats = await getHostDashboardStats(employeeId)
    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('Host dashboard error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
