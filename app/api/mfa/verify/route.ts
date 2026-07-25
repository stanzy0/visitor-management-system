import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { verifyTOTP, decryptSecret } from '@/lib/mfa/totp'

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
    const { code, type } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('two_factor_secret, backup_codes, failed_mfa_attempts, locked_until')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.two_factor_secret) {
      return NextResponse.json({ error: 'MFA not enabled' }, { status: 400 })
    }

    if (userRole.locked_until && new Date(userRole.locked_until) > new Date()) {
      return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts' }, { status: 423 })
    }

    let valid = false
    let usedBackup = false

    if (type === 'backup' && userRole.backup_codes) {
      const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
      const backupCode = userRole.backup_codes.find((bc: any) => bc.code === codeHash && !bc.used)
      if (backupCode) {
        valid = true
        usedBackup = true
        const updatedBackupCodes = userRole.backup_codes.map((bc: any) =>
          bc.code === codeHash ? { ...bc, used: true } : bc
        )
        await supabase.from('user_roles').update({ backup_codes: updatedBackupCodes }).eq('user_id', user.id)
      }
    } else {
      try {
        const secret = decryptSecret(userRole.two_factor_secret)
        if (verifyTOTP(secret, code)) {
          valid = true
        }
      } catch {
        valid = false
      }
    }

    if (!valid) {
      const failedAttempts = (userRole.failed_mfa_attempts || 0) + 1
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null

      await supabase.from('user_roles').update({
        failed_mfa_attempts: failedAttempts,
        locked_until: lockUntil,
      }).eq('user_id', user.id)

      await logAuditAction('Failed MFA Login', 'user', user.id, `Failed MFA attempt for ${user.email}`)

      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    await supabase.from('user_roles').update({
      failed_mfa_attempts: 0,
      locked_until: null,
    }).eq('user_id', user.id)

    await logAuditAction(
      usedBackup ? 'Backup Code Used' : 'Successful MFA Login',
      'user',
      user.id,
      `${usedBackup ? 'Backup code used' : 'MFA verified'} for ${user.email}`
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('MFA verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
