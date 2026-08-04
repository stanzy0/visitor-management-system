import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createGateActivity, createSecurityDecision } from '@/lib/server/security'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitor_id, visit_id, badge_id, verification_method, decision, denial_reason, activity_type = 'entry_attempt', direction = 'in', gate = 'Main Gate' } = body

    if (!visitor_id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const user = await getCurrentUser()
    const decidedBy = user?.email || 'security'

    const activity = await createGateActivity({
      visitor_id,
      visit_id: visit_id || null,
      badge_id: badge_id || null,
      activity_type: activity_type as any,
      direction: direction as any,
      gate,
      verified_by: decidedBy,
      verification_method: verification_method || 'qr',
      decision: decision || 'approved',
      denial_reason: denial_reason || null,
    })

    if (decision && decision !== 'approved') {
      await createSecurityDecision({
        visitor_id,
        visit_id: visit_id || null,
        decision: decision as any,
        reason: denial_reason || null,
        decided_by: decidedBy,
      })
    }

    return NextResponse.json({ success: true, data: activity }, { status: 201 })
  } catch (err) {
    console.error('Gate check-in error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
