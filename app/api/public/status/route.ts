import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    let data: any = null
    let error: any = null

    const { data: regData, error: regError } = await supabaseAdmin
      .from('visits')
      .select(`
        registration_number,
        status,
        created_at,
        check_in_time,
        check_out_time,
        visitor_id,
        employee_id,
        visitor:visitors(full_name),
        employee:employees(full_name, department, office_location),
        badge:visitor_badges(badge_number, qr_token)
      `)
      .eq('registration_number', q)
      .eq('source', 'public')
      .single()

    data = regData
    error = regError

    const { data: badgeData, error: badgeError } = await supabaseAdmin
      .from('visitor_badges')
      .select('visit_id')
      .eq('qr_token', q)
      .single()

    if (badgeData?.visit_id) {
      const { data: qrData, error: qrError } = await supabaseAdmin
        .from('visits')
        .select(`
          registration_number,
          status,
          created_at,
          check_in_time,
          check_out_time,
          visitor_id,
          employee_id,
          visitor:visitors(full_name),
          employee:employees(full_name, department, office_location),
          badge:visitor_badges(badge_number, qr_token)
        `)
        .eq('id', badgeData.visit_id)
        .eq('source', 'public')
        .single()

      data = qrData
      error = qrError
    }

    if (error || !data) {
      console.error('[public/status] lookup error', { q, error, data })
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
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
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
