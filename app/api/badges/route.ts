import { NextResponse, NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    let query = supabaseAdmin
      .from('visitor_badges')
      .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department))', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('badge_status', status)
    }

    if (search) {
      query = query.or(`badge_number.ilike.%${search}%,qr_token.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visit_id } = body

    if (!visit_id) {
      return NextResponse.json({ error: 'visit_id is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: visit } = await supabaseAdmin
      .from('visits')
      .select('status')
      .eq('id', visit_id)
      .single()

    if (!visit || !['approved', 'checked_in', 'checked_out'].includes(visit.status)) {
      return NextResponse.json({ error: 'Visit is not in a valid status for badge creation' }, { status: 400 })
    }

    const existing = await supabaseAdmin
      .from('visitor_badges')
      .select('id')
      .eq('visit_id', visit_id)
      .single()

    if (existing.data) {
      return NextResponse.json({ error: 'Badge already exists for this visit' }, { status: 400 })
    }

    const badgeNumberRes = await supabaseAdmin.rpc('generate_visitor_badge_number')
    if (badgeNumberRes.error || !badgeNumberRes.data) {
      return NextResponse.json({ error: 'Failed to generate badge number' }, { status: 500 })
    }

    const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { data: badge, error } = await supabaseAdmin
      .from('visitor_badges')
      .insert({
        visit_id,
        badge_number: badgeNumberRes.data,
        qr_token: qrToken,
        badge_status: 'Active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: badge }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
