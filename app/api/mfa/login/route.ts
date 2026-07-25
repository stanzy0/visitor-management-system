import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTP, hashBackupCode } from '@/lib/mfa/totp'

async function logAuditAction(action: string, entityType: string, entityId: string | null, details: string) {
  try {
    const supabase = await createClient()
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
  try {
    const { email, password, rememberDevice } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('two_factor_enabled, failed_mfa_attempts, locked_until')
      .eq('user_id', data.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userRole.locked_until && new Date(userRole.locked_until) > new Date()) {
      return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts' }, { status: 423 })
    }

    if (userRole.two_factor_enabled) {
      const response = NextResponse.json({
        mfaRequired: true,
        sessionId: data.session?.access_token,
      })

      if (rememberDevice) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        response.cookies.set('mfa_remember_device', 'true', {
          expires: expiresAt,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      }

      return response
    }

    const response = NextResponse.json({ success: true })

    if (rememberDevice) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      response.cookies.set('mfa_remember_device', 'true', {
        expires: expiresAt,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }

    return response
  } catch (err) {
    console.error('MFA login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
