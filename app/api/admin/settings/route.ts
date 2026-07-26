import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/client/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('Fetch settings error:', err)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const settings = Array.isArray(body) ? body : [body]

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert(settings, { onConflict: 'key' })

    if (error) {
      throw new Error(error.message)
    }

    await logAuditAction('System Setting Changed', 'system_settings', null, 'System configuration updated via admin portal')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update settings' }, { status: 500 })
  }
}
