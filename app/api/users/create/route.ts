import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function logAuditAction(action: string, entityType: string, entityId: string | null, details: string) {
  try {
    const { supabase } = await import('@/lib/supabase')
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

export async function POST(request: NextRequest) {
  const authResult = requireAdmin()
  if (!(await authResult).authorized) {
    const result = await authResult
    return NextResponse.json({ success: false, message: result.error, error: result.error }, { status: result.status })
  }

  try {
    const { email, full_name, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const tempPassword = generateTemporaryPassword()

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    const userId = authUser.user.id

    try {
      await logAuditAction('Authentication Account Created', 'user', userId, `Created auth account for ${email}`)
    } catch (err) {
      console.error('Failed to log auth account creation audit:', err)
    }

    try {
      await logAuditAction('Temporary Password Generated', 'user', userId, `Temporary password generated for ${email}`)
    } catch (err) {
      console.error('Failed to log temp password audit:', err)
    }

    const { data: userRole, error: dbError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        email,
        full_name,
        role,
        must_change_password: true,
      })
      .select()
      .single()

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('Failed to create user role assignment:', dbError.message)
      try {
        await logAuditAction('User Creation Failed', 'user', userId, `Role assignment failed for ${email}: ${dbError.message}`)
      } catch (err) {
        console.error('Failed to log failed user creation audit:', err)
      }
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    try {
      await logAuditAction('User Created', 'user', userId, `Created user ${email} with ${role} role`)
    } catch (err) {
      console.error('Failed to log user creation audit:', err)
    }

    return NextResponse.json({
      success: true,
      user: userRole,
      tempPassword,
    })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}