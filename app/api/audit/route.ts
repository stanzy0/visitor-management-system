import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { action, entityType, entityId, details } = body

    if (!action || !entityType) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const userEmail = authResult.userEmail || 'anonymous'

    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        performed_by: userEmail,
        details: details || '',
      })

     if (error) {
       return NextResponse.json({ success: false, message: 'Failed to log audit action', error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
