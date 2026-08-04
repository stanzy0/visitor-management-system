import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getSecurityAlerts, resolveSecurityAlert } from '@/lib/server/security'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const unresolvedOnly = searchParams.get('unresolvedOnly') === 'true'
    const alerts = await getSecurityAlerts(unresolvedOnly)
    return NextResponse.json({ success: true, data: alerts })
  } catch (err) {
    console.error('Security alerts error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const alert = await resolveSecurityAlert(id, authResult.userEmail || 'security')
    return NextResponse.json({ success: true, data: alert })
  } catch (err) {
    console.error('Resolve alert error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
