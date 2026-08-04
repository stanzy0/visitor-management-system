import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getAuditLogs } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      user: searchParams.get('user') || undefined,
      action: searchParams.get('action') || undefined,
      entity_type: searchParams.get('entity_type') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    }

    const logs = await getAuditLogs(filters)
    return NextResponse.json({ success: true, data: logs })
  } catch (err) {
    console.error('Fetch audit logs error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
