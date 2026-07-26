import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getBackupRecords, createBackupRecord } from '@/lib/server/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const records = await getBackupRecords()
    return NextResponse.json({ success: true, data: records })
  } catch (err) {
    console.error('Fetch backups error:', err)
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `backup-${timestamp}.sql`
      const record = await createBackupRecord({
        filename,
        size: '0 MB',
        status: 'completed',
      })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Backup failed' }, { status: 500 })
  }
}
