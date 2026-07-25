import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

async function logAuditAction(action: string, entityType: string, entityId: string | null, details: string) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      performed_by: 'system',
      details,
    })
  } catch (err) {
    console.error('Failed to log audit action:', err)
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_roles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_enabled_at: null,
        backup_codes: null,
      })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditAction('Two-Factor Disabled', 'user', user.id, `MFA disabled for ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('MFA disable error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
