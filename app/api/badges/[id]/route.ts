import { NextResponse, NextRequest } from 'next/server'
import { requireAdmin, requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('visitor_badges')
      .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department))')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['Admin', 'Receptionist'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'print') {
      const { data: badge } = await supabaseAdmin
        .from('visitor_badges')
        .select('reprint_count')
        .eq('id', id)
        .single()

      if (!badge) {
        return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
      }

      const { error } = await supabaseAdmin
        .from('visitor_badges')
        .update({
          printed_at: new Date().toISOString(),
          printed_by: null,
          reprint_count: (badge as any).reprint_count + 1,
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Badge printed' })
    }

    if (action === 'reprint') {
      const { data: badge } = await supabaseAdmin
        .from('visitor_badges')
        .select('reprint_count')
        .eq('id', id)
        .single()

      if (!badge) {
        return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
      }

      const { error } = await supabaseAdmin
        .from('visitor_badges')
        .update({
          printed_at: new Date().toISOString(),
          printed_by: null,
          reprint_count: (badge as any).reprint_count + 1,
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Badge reprinted' })
    }

    if (action === 'cancel') {
      const { error } = await supabaseAdmin
        .from('visitor_badges')
        .update({ badge_status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Badge cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
