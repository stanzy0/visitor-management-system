import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { generateBackupCodes } from '@/lib/mfa/totp'

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
    return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })

    if (authError) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(code => ({
      code: crypto.createHash('sha256').update(code.toUpperCase()).digest('hex'),
      used: false,
    }))

    const { error } = await supabase
      .from('user_roles')
      .update({ backup_codes: hashedBackupCodes })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    await logAuditAction('Backup Codes Generated', 'user', user.id, `Backup codes regenerated for ${user.email}`)

    return NextResponse.json({ backupCodes })
  } catch (err) {
    console.error('Backup codes regeneration error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
