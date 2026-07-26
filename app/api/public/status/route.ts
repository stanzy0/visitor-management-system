import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('visits')
      .select(`
        registration_number,
        status,
        visitor:visitors(full_name),
        employee:employees(full_name, department, office_location),
        badge:visitor_badges(badge_number, qr_token),
        check_in_time,
        check_out_time
      `)
      .eq('source', 'public')
      .or(`registration_number.ilike.%${q}%,badge.qr_token.ilike.%${q}%`)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const visit = data as any
    const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
    const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee
    const badge = Array.isArray(visit.badge) ? visit.badge[0] : visit.badge

    return NextResponse.json({
      data: {
        registration_number: visit.registration_number,
        status: visit.status,
        visitor_name: visitor?.full_name || 'Unknown',
        visit_date: visit.created_at ? new Date(visit.created_at).toISOString().split('T')[0] : 'N/A',
        host_name: employee?.full_name || 'N/A',
        department: employee?.department || 'N/A',
        office_location: employee?.office_location || 'N/A',
        badge_number: badge?.badge_number,
        qr_token: badge?.qr_token,
        check_in_time: visit.check_in_time,
        check_out_time: visit.check_out_time,
      },
    })
  } catch (err) {
    console.error('Public status check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
