import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    console.log('================================')
    console.log('STEP 1')
    console.log('QUERY NAME: visitor_badges lookup')
    console.log('INPUT:', token)
    console.log('================================')

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, reason: 'server_not_configured', message: 'Service role key not configured', error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: badge, error: badgeError } = await supabaseAdmin
      .from('visitor_badges')
      .select('id, visit_id, badge_number, qr_token, badge_status, issued_at, expires_at')
      .eq('qr_token', token)
      .single()

    console.log('RESULT:', badge)
    console.log('ERROR:', badgeError)

    if (badgeError) {
      console.log('BADGE QUERY FAILED')
      return NextResponse.json({ success: false, reason: 'badge_query_failed', message: 'Badge lookup failed.', supabase_error: badgeError, token }, { status: 500 })
    }

    if (!badge) {
      console.log('NOT FOUND: visitor_badges')
      return NextResponse.json({ success: false, reason: 'badge_not_found', message: 'Badge not found.', error: 'Badge not found' }, { status: 404 })
    }

    console.log('FOUND BADGE')

    console.log('================================')
    console.log('STEP 2')
    console.log('QUERY NAME: visits lookup')
    console.log('INPUT:', badge.visit_id)
    console.log('================================')

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .select('id, registration_number, status, visitor_type, source, rejection_reason, check_in_time, check_out_time, created_at, purpose, visitor_id, employee_id, appointment_id')
      .eq('id', badge.visit_id)
      .single()

    console.log('RESULT:', visit)
    console.log('ERROR:', visitError)

    if (visitError) {
      console.log('VISIT QUERY FAILED')
      return NextResponse.json({ success: false, reason: 'visit_query_failed', message: 'Visit lookup failed.', supabase_error: visitError, visit_id: badge.visit_id }, { status: 500 })
    }

    if (!visit) {
      console.log('NOT FOUND: visits')
      return NextResponse.json({ success: false, reason: 'visit_not_found', message: 'Visit not found.', error: 'Visit not found' }, { status: 404 })
    }

    console.log('FOUND VISIT')

    console.log('================================')
    console.log('STEP 3')
    console.log('QUERY NAME: visitors lookup')
    console.log('INPUT:', visit.visitor_id)
    console.log('================================')

    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from('visitors')
      .select('id, full_name, email, phone, visitor_organization, photo_url, nationality, gender')
      .eq('id', visit.visitor_id)
      .single()

    console.log('RESULT:', visitor)
    console.log('ERROR:', visitorError)

    if (visitorError) {
      console.log('VISITOR QUERY FAILED')
      return NextResponse.json({ success: false, reason: 'visitor_query_failed', message: 'Visitor lookup failed.', supabase_error: visitorError, visitor_id: visit.visitor_id }, { status: 500 })
    }

    if (!visitor) {
      console.log('NOT FOUND: visitor')
      return NextResponse.json({ success: false, reason: 'visitor_not_found', message: 'Visitor not found.', error: 'Visitor not found' }, { status: 404 })
    }

    console.log('FOUND VISITOR')

    console.log('================================')
    console.log('STEP 4')
    console.log('QUERY NAME: employees lookup')
    console.log('INPUT:', visit.employee_id)
    console.log('supabaseAdmin is service-role client:', !!supabaseAdmin)
    console.log('supabaseAdmin !== null:', supabaseAdmin !== null)
    console.log('================================')

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, department, office_location, email')
      .eq('id', visit.employee_id)
      .single()

    console.log('employee_id:', visit.employee_id)
    console.log('employee query result:', employee)
    console.log('employee query error:', employeeError)

    if (employeeError) {
      console.log('EMPLOYEE QUERY FAILED')
      const supabaseErrorMessage = employeeError.message || JSON.stringify(employeeError)
      return NextResponse.json({
        success: false,
        reason: 'employee_query_failed',
        employee_id: visit.employee_id,
        employee: employee,
        supabase_error: {
          code: employeeError.code,
          message: employeeError.message,
          details: employeeError.details,
          hint: employeeError.hint,
        },
        supabase_error_raw: employeeError,
        supabase_error_message: supabaseErrorMessage,
      }, { status: 500 })
    }

    if (!employee) {
      console.log('NOT FOUND: employee')
      return NextResponse.json({
        success: false,
        reason: 'employee_not_found',
        employee_id: visit.employee_id,
        employee: employee,
      }, { status: 404 })
    }

    console.log('FOUND EMPLOYEE')

    console.log('================================')
    console.log('STEP 5')
    console.log('QUERY NAME: appointments lookup')
    console.log('INPUT:', visit.appointment_id)
    console.log('================================')

    let appointment = null
    if (visit.appointment_id) {
      const { data: appointmentData, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select('id, appointment_date, appointment_time, expected_arrival, status, purpose')
        .eq('id', visit.appointment_id)
        .single()

      console.log('RESULT:', appointmentData)
      console.log('ERROR:', appointmentError)

      if (appointmentError) {
        console.log('APPOINTMENT QUERY FAILED')
      }

      appointment = appointmentData || null
    } else {
      console.log('RESULT: null (no appointment_id)')
      console.log('ERROR: null')
    }

    console.log('================================')
    console.log('STEP 6')
    console.log('QUERY NAME: return payload')
    console.log('================================')

    const responseData = {
      id: visit.id,
      registration_number: visit.registration_number,
      status: visit.status,
      visitor_type: visit.visitor_type,
      source: visit.source,
      rejection_reason: visit.rejection_reason,
      check_in_time: visit.check_in_time,
      check_out_time: visit.check_out_time,
      created_at: visit.created_at,
      purpose: visit.purpose,
      visitor,
      employee,
      appointment,
      badge: {
        id: badge.id,
        badge_number: badge.badge_number,
        qr_token: badge.qr_token,
        issued_at: badge.issued_at,
        expires_at: badge.expires_at,
        badge_status: badge.badge_status,
      },
    }

    console.log('RETURNING SUCCESS')
    return NextResponse.json({ success: true, data: responseData })
  } catch (err) {
    console.error('Portal visit fetch error:', err)
    return NextResponse.json({ success: false, reason: 'internal_error', message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
