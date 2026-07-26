import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getAdminDashboardStats, getSystemHealth } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const [stats, health] = await Promise.all([
      getAdminDashboardStats(),
      getSystemHealth(),
    ])

    return NextResponse.json({ success: true, data: { stats, health } })
  } catch (err) {
    console.error('Admin dashboard error:', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
