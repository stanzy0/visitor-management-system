import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/server/email'
import { createHostEmployeeNotification, createSystemNotification } from '@/lib/notifications'
import { logAuditAction } from '@/lib/client/audit'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visit_id, action, reason } = body

    if (!visit_id || !action) {
      return NextResponse.json({ error: 'visit_id and action are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: visit, error: fetchError } = await supabaseAdmin
      .from('visits')
      .select('*, visitor:visitors(*), employee:employees(*)')
      .eq('id', visit_id)
      .single()

    if (fetchError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
    const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee

    if (action === 'approve') {
      const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { data: badge, error: badgeError } = await supabaseAdmin
        .from('visitor_badges')
        .insert({
          visit_id,
          badge_number: `BADGE-${Date.now().toString(36).toUpperCase()}`,
          qr_token: qrToken,
          badge_status: 'Active',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (badgeError || !badge) {
        return NextResponse.json({ error: 'Failed to create badge' }, { status: 500 })
      }

      const { error: updateError } = await supabaseAdmin
        .from('visits')
        .update({ status: 'approved' })
        .eq('id', visit_id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update visit status' }, { status: 500 })
      }

      const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ registrationNumber: visit.registration_number, visitId: visit.id, type: 'public-visitor' }), { width: 300, margin: 2 })

      await sendEmail({
        to: visitor?.email || '',
        recipientName: visitor?.full_name || 'Visitor',
        subject: `Registration Approved - ${visit.registration_number}`,
        template: 'registration_approved',
        data: {
          visitorName: visitor?.full_name || 'Visitor',
          registrationNumber: visit.registration_number,
          date: visit.visit_date || new Date().toISOString().split('T')[0],
          arrivalTime: visit.arrival_time || 'TBD',
          hostName: employee?.full_name || 'Host',
          location: employee?.office_location || 'Reception',
          badgeNumber: badge.badge_number,
          qrCodeUrl: qrDataUrl,
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })

      if (employee?.user_id) {
        await createHostEmployeeNotification(
          employee.id,
          'Visitor Registration Approved',
          `${visitor?.full_name || 'A visitor'}'s registration has been approved for ${visit.visit_date || 'today'}.`,
          'visitor',
          'visit',
          visit_id
        )
      }

      await createSystemNotification(
        'Registration Approved',
        `Public registration ${visit.registration_number} for ${visitor?.full_name || 'visitor'} has been approved.`,
        'success',
        'visit',
        visit_id
      )

      await logAuditAction('Public Registration Approved', 'visit', visit_id, `Registration ${visit.registration_number} approved`)

      return NextResponse.json({ success: true, data: { badge_number: badge.badge_number, qr_token: badge.qr_token } })
    }

    if (action === 'reject') {
      const { error: updateError } = await supabaseAdmin
        .from('visits')
        .update({ status: 'rejected', rejection_reason: reason || null })
        .eq('id', visit_id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update visit status' }, { status: 500 })
      }

      await sendEmail({
        to: visitor?.email || '',
        recipientName: visitor?.full_name || 'Visitor',
        subject: `Registration Update - ${visit.registration_number}`,
        template: 'registration_rejected',
        data: {
          visitorName: visitor?.full_name || 'Visitor',
          registrationNumber: visit.registration_number,
          date: visit.visit_date || new Date().toISOString().split('T')[0],
          hostName: employee?.full_name || 'Host',
          reason: reason || 'Not specified',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })

      await logAuditAction('Public Registration Rejected', 'visit', visit_id, `Registration ${visit.registration_number} rejected. Reason: ${reason || 'None'}`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 })
  } catch (err) {
    console.error('Public registration action error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('visits')
      .select('*, visitor:visitors(full_name, email, phone), employee:employees(full_name, department)')
      .eq('source', 'public')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('Fetch pending public registrations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
