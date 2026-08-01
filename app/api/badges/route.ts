import { NextResponse, NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/server/email'
import { getPortalUrl } from '@/lib/utils/portal-url'
import QRCode from 'qrcode'

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
      .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, email, photo_url), employee:employees(full_name, department, email))', { count: 'exact' })
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
      .select('*, visitor:visitors(*), employee:employees(*)')
      .eq('id', visit_id)
      .single()

    if (!visit || !['approved', 'checked_in', 'checked_out'].includes(visit.status)) {
      return NextResponse.json({ error: 'Visit is not in a valid status for badge creation' }, { status: 400 })
    }

    const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
    const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee

    if (!visit.registration_number) {
      console.error('[Badge Creation Error]', {
        reason: 'Missing registration_number',
        visit_id,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Visit is missing registration_number' }, { status: 400 })
    }

    if (!visitor?.id) {
      console.error('[Badge Creation Error]', {
        reason: 'Missing visitor',
        visit_id,
        registration_number: visit.registration_number,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Visit is missing visitor record' }, { status: 400 })
    }

    const { data: existingBadge } = await supabaseAdmin
      .from('visitor_badges')
      .select('id')
      .eq('visit_id', visit_id)
      .single()

    if (existingBadge) {
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

    if (!badge.qr_token || !badge.badge_number) {
      console.error('[Badge Creation Error]', {
        reason: 'Badge creation returned missing qr_token or badge_number',
        badge_id: badge.id,
        visit_id,
        registration_number: visit.registration_number,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Badge creation failed: missing qr_token' }, { status: 500 })
    }

    const portalUrl = getPortalUrl(badge.qr_token)
    const qrDataUrl = await QRCode.toDataURL(portalUrl, { width: 300, margin: 2 })

    console.log('[Badge Created]', {
      badge_number: badge.badge_number,
      qr_token: badge.qr_token,
      portal_url: portalUrl,
      visit_id,
      registration_number: visit.registration_number,
      visitor_id: visitor?.id,
      visitor_name: visitor?.full_name,
      employee_id: employee?.id,
      host_name: employee?.full_name,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })

    if (visitor?.email) {
      await sendEmail({
        to: visitor.email,
        recipientName: visitor.full_name || 'Visitor',
        subject: `Your Visitor Badge is Ready - ${visit.registration_number}`,
        template: 'badge_ready',
        data: {
          visitorName: visitor.full_name || 'Visitor',
          badgeNumber: badge.badge_number,
          qrCodeUrl: qrDataUrl,
          portalUrl: portalUrl,
          visitDate: visit.visit_date || new Date().toISOString().split('T')[0],
          hostName: employee?.full_name || 'Host',
          location: employee?.office_location || 'Reception',
          purpose: visit.purpose || 'Visit',
          orgName: 'AFCSC Visitor Management',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })
    }

    if (employee?.email) {
      await sendEmail({
        to: employee.email,
        recipientName: employee.full_name || 'Host',
        subject: `Visitor Badge Ready - ${visit.registration_number}`,
        template: 'badge_ready',
        data: {
          visitorName: visitor?.full_name || 'Visitor',
          badgeNumber: badge.badge_number,
          visitDate: visit.visit_date || new Date().toISOString().split('T')[0],
          hostName: employee.full_name || 'Host',
          purpose: visit.purpose || 'Visit',
          company: visitor?.visitor_organization || 'N/A',
          orgName: 'AFCSC Visitor Management',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })
    }

    return NextResponse.json({ data: badge }, { status: 201 })
  } catch (err) {
    console.error('Badge creation error:', err)

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
