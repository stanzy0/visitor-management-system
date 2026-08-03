import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/client/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    await supabaseAdmin.auth.admin.signOut(user_id, 'global')
    await logAuditAction('Force Logout', 'user', user_id, `Force logged out user ${user_id}`)

    return NextResponse.json({ success: true, message: 'User logged out successfully' })
  } catch (err) {
    console.error('Force logout error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to logout user' }, { status: 500 })
  }
}
