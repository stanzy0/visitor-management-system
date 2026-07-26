import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getSecurityDashboardStats } from '@/lib/server/security'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const stats = await getSecurityDashboardStats()
    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('Security stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch security stats' }, { status: 500 })
  }
}
