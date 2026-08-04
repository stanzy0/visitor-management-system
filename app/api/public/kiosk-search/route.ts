import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const term = q.trim()

    // Step 1: Find matching visitors
    const { data: visitors, error: visitorError } = await supabaseAdmin
      .from('visitors')
      .select('id, full_name, phone, email, visitor_organization, photo_url')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(50)

    if (visitorError) {
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    if (!visitors || visitors.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const visitorIds = visitors.map((v: any) => v.id)

    // Step 2: Find active visits for those visitors
    const { data: visits, error } = await supabaseAdmin
      .from('visits')
      .select(`
        id,
        registration_number,
        status,
        source,
        purpose,
        created_at,
        check_in_time,
        visitor:visitors(full_name, phone, email, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location),
        badge:visitor_badges(badge_number, badge_status, qr_token, expires_at)
      `)
      .in('visitor_id', visitorIds)
      .eq('source', 'public')
      .in('status', ['pending', 'approved', 'checked_in'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    const results = (visits || []).map((visit: any) => {
      const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
      const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee
      const badge = Array.isArray(visit.badge) ? visit.badge[0] : visit.badge

      return {
        id: visit.id,
        registration_number: visit.registration_number,
        status: visit.status,
        purpose: visit.purpose,
        created_at: visit.created_at,
        check_in_time: visit.check_in_time,
        visitor_name: visitor?.full_name || 'Unknown',
        visitor_phone: visitor?.phone || null,
        visitor_email: visitor?.email || null,
        visitor_organization: visitor?.visitor_organization || null,
        photo_url: visitor?.photo_url || null,
        host_name: employee?.full_name || 'N/A',
        department: employee?.department || 'N/A',
        office_location: employee?.office_location || 'N/A',
        badge_number: badge?.badge_number || null,
        badge_status: badge?.badge_status || null,
        qr_token: badge?.qr_token || null,
        badge_expires_at: badge?.expires_at || null,
      }
    })

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('Kiosk search error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
