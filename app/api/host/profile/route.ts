import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getHostProfile, updateHostProfile } from '@/lib/server/host'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const profile = await getHostProfile(employeeId)
    if (!profile) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: profile })
  } catch (err) {
    console.error('Host profile error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const profile = await updateHostProfile(employeeId, body)
    return NextResponse.json({ success: true, data: profile })
  } catch (err) {
    console.error('Update profile error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
