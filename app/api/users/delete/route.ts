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

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status as never })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const admin = supabaseAdmin
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: beforeDelete } = await admin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)

    if (!beforeDelete || beforeDelete.length === 0) {
      await logAuditAction('User Already Deleted', 'user', userId, `No user_roles row found for ${userId}`)
      return NextResponse.json({ success: false, message: 'No matching user_roles row found.', rowsDeleted: 0 }, { status: 404 })
    }

    const { data: deletedRows, error: deleteError } = await admin
       .from('user_roles')
       .delete()
       .eq('user_id', userId)
       .select()

     if (deleteError || !deletedRows || deletedRows.length === 0) {
      console.error('[DELETE USER] Delete failed:', deleteError?.message)
      await logAuditAction('User Delete Failed', 'user', userId, `user_roles delete failed: ${deleteError?.message || 'no rows deleted'}`)
      return NextResponse.json({ success: false, reason: deleteError?.message || 'No rows deleted', rowsDeleted: 0 }, { status: 500 })
    }

    const { data: afterDelete } = await admin
       .from('user_roles')
       .select('*')
       .eq('user_id', userId)

     let authDeleted = false
    if (admin) {
      const { error: authError } = await admin.auth.admin.deleteUser(userId)

       if (authError) {
         authDeleted = false
      } else {
        authDeleted = true
      }
    }

    await logAuditAction('User Deleted', 'user', userId, `Deleted user ${beforeDelete[0]?.email}`)

    return NextResponse.json({ success: true, rowsDeleted: deletedRows.length, authDeleted, deletedUserId: userId })
  } catch (err) {
    console.error('[DELETE USER] Unexpected error:', err)
    return NextResponse.json({ success: false, reason: 'Internal server error', rowsDeleted: 0 }, { status: 500 })
  }
}
