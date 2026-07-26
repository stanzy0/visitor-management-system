import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getHostVisitors, approveVisitor, rejectVisitor } from '@/lib/server/host'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const visitors = await getHostVisitors(employeeId, { status, search })
    return NextResponse.json({ success: true, data: visitors })
  } catch (err) {
    console.error('Host visitors error:', err)
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitId, action, reason } = body

    const employeeId = request.headers.get('x-employee-id') || 'default'

    if (action === 'approve') {
      const updated = await approveVisitor(visitId, employeeId)
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }
      const updated = await rejectVisitor(visitId, employeeId, reason)
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Host visitor action error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to process action' }, { status: 500 })
  }
}
