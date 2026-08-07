import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { logAuditAction } from '@/lib/server/audit'
import { createHostAssistanceNotification } from '@/lib/server/notifications'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitId, hostName, visitorName } = body

    if (!visitId) {
      return NextResponse.json({ success: false, message: 'Visit ID required', error: '' }, { status: 400 })
    }

    await createHostAssistanceNotification(visitId, hostName || 'Host', visitorName || 'Unknown')

    await logAuditAction('Host Requested Assistance', 'visit', visitId, `Assistance requested for ${visitorName || 'Unknown'}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Host assistance notification error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
