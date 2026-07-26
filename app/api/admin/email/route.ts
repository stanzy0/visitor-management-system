import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getEmailSettings, updateEmailSettings, sendTestEmail } from '@/lib/server/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const settings = await getEmailSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (err) {
    console.error('Fetch email settings error:', err)
    return NextResponse.json({ error: 'Failed to fetch email settings' }, { status: 500 })
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
    await updateEmailSettings(body)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update email settings error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update email settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const result = await sendTestEmail(email)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Send test email error:', err)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
