import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-helpers'

async function logAuditAction(action: string, entityType: string, entityId: string | null, details: string) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      performed_by: 'admin',
      details,
    })
  } catch (err) {
    console.error('Failed to log audit action:', err)
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status as never })
  }

  try {
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 })
    }

    let updateData: { ban_duration?: string } = {}

    if (action === 'disable') {
      updateData = { ban_duration: '876000h' }
    } else if (action === 'enable') {
      updateData = { ban_duration: 'none' }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: user } = await supabase
      .from('user_roles')
      .select('email')
      .eq('user_id', userId)
      .single()

    await logAuditAction(action === 'disable' ? 'User Disabled' : 'User Enabled', 'user', userId, `${action === 'disable' ? 'Disabled' : 'Enabled'} user ${user?.email}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('User status update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}