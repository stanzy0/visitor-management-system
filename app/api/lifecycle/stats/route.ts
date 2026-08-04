import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getLifecycleStats } from '@/lib/server/lifecycle'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || 'today') as 'today' | '7days' | '30days'
    const stats = await getLifecycleStats(range)
    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('Lifecycle stats error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
