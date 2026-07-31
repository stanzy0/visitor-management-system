import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import { createHostEmployeeNotification, createSystemNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/server/email'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { visit_id } = body

    if (!visit_id) {
      return NextResponse.json({ error: 'visit_id is required' }, { status: 400 })
    }

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .select('*, visitor:visitors(*), employee:employees(*)')
      .eq('id', visit_id)
      .single()

    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    if (visit.status === 'checked_in') {
      return NextResponse.json({ error: 'Visitor has already checked in' }, { status: 400 })
    }

    if (visit.status === 'checked_out') {
      return NextResponse.json({ error: 'Visitor has already checked out' }, { status: 400 })
    }

    if (visit.status === 'cancelled') {
      return NextResponse.json({ error: 'Visit has been cancelled' }, { status: 400 })
    }

    if (visit.status === 'rejected') {
      return NextResponse.json({ error: 'Visit has been rejected' }, { status: 400 })
    }

    const checkInTime = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('visits')
      .update({
        status: 'checked_in',
        check_in_time: checkInTime,
      })
      .eq('id', visit_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
    const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee

    await logAuditAction('Visitor Checked In via Kiosk', 'visit', visit_id, `${visitor?.full_name || 'Visitor'} checked in via kiosk`)

    if (employee) {
      await createHostEmployeeNotification(employee.id, 'Visitor Checked In', `${visitor?.full_name || 'Visitor'} has checked in at the kiosk.`, 'info', 'visit', visit_id)
    }

    await createSystemNotification('Visitor Checked In', `${visitor?.full_name || 'Visitor'} checked in via kiosk for ${employee?.full_name || 'host'}`, 'info', 'visit', visit_id)

    if (employee?.email) {
      await sendEmail({
        to: employee.email,
        recipientName: employee.full_name || 'Host',
        subject: `Visitor Has Arrived - ${visit.registration_number}`,
        template: 'visitor_arrival',
        data: {
          visitorName: visitor?.full_name || 'Visitor',
          company: visitor?.visitor_organization || 'N/A',
          purpose: visit.purpose || 'Visit',
          time: new Date().toLocaleTimeString(),
          location: employee.office_location || 'Reception',
          badgeNumber: visit.badge_number || 'N/A',
          orgName: 'AFCSC Visitor Management',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        visit_id,
        status: 'checked_in',
        check_in_time: checkInTime,
        visitor_name: visitor?.full_name || 'Visitor',
        host_name: employee?.full_name || 'Host',
        office_location: employee?.office_location || 'N/A',
      },
    })
  } catch (err) {
    console.error('Kiosk check-in error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
