import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import { createVisitorDeletedNotification, getVisitorName } from '@/lib/server/notifications'

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ success: false, message: 'Visitor ID required', error: '' }, { status: 400 })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const visitorName = await getVisitorName(id) || 'Unknown Visitor'

    const { error } = await supabaseAdmin
      .from('visitors')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: '' }, { status: 500 })
    }

    await logAuditAction('Visitor Deleted', 'visitor', id, `Visitor ${visitorName} deleted`)

    await createVisitorDeletedNotification(id, visitorName)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete visitor error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
