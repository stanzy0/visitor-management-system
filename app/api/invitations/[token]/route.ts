import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getInvitationByToken, updateInvitationStatus, approveInvitation, rejectInvitation, cancelInvitation } from '@/lib/server/invitations'
import { logAuditAction } from '@/lib/server/audit'
import { sendEmail } from '@/lib/server/email'
import { buildPortalQrUrl } from '@/lib/utils/portal-url'
import type { EmailTemplate } from '@/lib/email/types'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const invitation = await getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    if (invitation.status === 'Expired' || invitation.status === 'Cancelled' || invitation.status === 'Completed') {
      return NextResponse.json(
        { error: `This invitation has been ${invitation.status.toLowerCase()}. Please contact your host.` },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      await updateInvitationStatus(token, 'Expired')
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    return NextResponse.json({ data: invitation })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'register': {
        if (!supabaseAdmin) {
          return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
        }

        const { full_name, email, phone, organization, address, nationality, gender, vehicle_plate, vehicle_type, emergency_contact, purpose, accept_privacy } = body

        if (!full_name || !email || !accept_privacy) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
        }

        const invitation = await getInvitationByToken(token)
        if (!invitation) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
        }

        if (invitation.status === 'Completed' || invitation.status === 'Expired' || invitation.status === 'Cancelled') {
          return NextResponse.json({ success: false, message: `Invitation is ${invitation.status.toLowerCase()}`, error: `Invitation is ${invitation.status.toLowerCase()}` }, { status: 400 })
        }

        const now = new Date()
        const expiresAt = new Date(invitation.expires_at)
        if (now > expiresAt) {
          await updateInvitationStatus(token, 'Expired')
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
        }

        const { data: existingVisitor } = await supabase
          .from('visitors')
          .select('id')
          .eq('email', email)
          .single()

        let visitorId = existingVisitor?.id

        if (!visitorId) {
          const { data: newVisitor, error: visitorError } = await supabaseAdmin
            .from('visitors')
            .insert({
              full_name,
              email,
              phone: phone || null,
              visitor_organization: organization || null,
              visitor_address: address || null,
              nationality: nationality || null,
              gender: gender || null,
              vehicle_plate: vehicle_plate || null,
              vehicle_type: vehicle_type || null,
              emergency_contact: emergency_contact || null,
            })
            .select('id')
            .single()

          if (visitorError || !newVisitor) {
            return NextResponse.json({ success: false, message: visitorError?.message || 'Failed to create visitor', error: visitorError?.message || 'Failed to create visitor' }, { status: 400 })
          }

          visitorId = newVisitor.id
        } else if (body.update_existing) {
          const { error: updateError } = await supabaseAdmin
            .from('visitors')
            .update({
              phone: phone || null,
              visitor_organization: organization || null,
              visitor_address: address || null,
              nationality: nationality || null,
              gender: gender || null,
              vehicle_plate: vehicle_plate || null,
              vehicle_type: vehicle_type || null,
              emergency_contact: emergency_contact || null,
            })
            .eq('id', visitorId)

          if (updateError) {
            return NextResponse.json({ success: false, message: updateError.message, error: updateError.message }, { status: 400 })
          }
        }

        const { data: appointment, error: appointmentError } = await supabaseAdmin
          .from('appointments')
          .insert({
            visitor_id: visitorId,
            employee_id: invitation.host_employee_id,
            appointment_date: invitation.expected_date,
            expected_arrival: invitation.expected_time || '09:00',
            expected_departure: invitation.expected_time || '17:00',
            purpose: invitation.purpose,
            notes: invitation.notes || '',
            status: 'Scheduled',
          })
          .select()
          .single()

        if (appointmentError || !appointment) {
          return NextResponse.json({ success: false, message: appointmentError?.message || 'Failed to create appointment', error: appointmentError?.message || 'Failed to create appointment' }, { status: 400 })
        }

        await updateInvitationStatus(token, 'Completed')

        await logAuditAction('Registration Submitted', 'invitation', invitation.id, `Visitor ${full_name} completed registration for invitation ${token}`)

        return NextResponse.json({ data: { visitor_id: visitorId, appointment_id: appointment.id, invitation_token: token } }, { status: 201 })
      }

      case 'approve': {
        if (!supabaseAdmin) {
          return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
        }

        const invitation = await approveInvitation(token)
        await logAuditAction('Invitation Approved', 'invitation', invitation.id, `Invitation ${token} approved`)

        const { data: host } = await supabaseAdmin
          .from('employees')
          .select('full_name, department')
          .eq('id', invitation.host_employee_id)
          .single()

        const { data: badge } = await supabaseAdmin
          .from('visitor_badges')
          .select('id, badge_number, qr_token')
          .eq('visit_id', invitation.appointment_id)
          .single()

        if (badge) {
          const portalUrl = buildPortalQrUrl(badge.qr_token)
          const qrDataUrl = await QRCode.toDataURL(portalUrl, { width: 300, margin: 2 })

          void sendEmail({
            to: invitation.visitor_email,
            recipientName: invitation.visitor_name,
            subject: 'Visitor Approval Confirmation',
            template: 'invitation_approved' as EmailTemplate,
            data: {
              visitorName: invitation.visitor_name,
              hostName: host?.full_name || 'Our Team',
              date: invitation.expected_date,
              time: invitation.expected_time || 'TBD',
              badgeNumber: badge.badge_number,
              portalUrl,
              qrCodeUrl: qrDataUrl,
            },
            relatedType: 'invitation',
            relatedId: invitation.id,
          })

          await logAuditAction('Badge Generated From Invitation', 'badge', badge.id, `Badge ${badge.badge_number} generated from invitation ${token}`)
          await logAuditAction('Approval Email Sent', 'invitation', invitation.id, `Approval email sent to ${invitation.visitor_name}`)
        }

        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: invitation.host_employee_id,
            title: 'Registration Approved',
            message: `Registration for ${invitation.visitor_name} has been approved`,
            type: 'appointment_approved',
          })

        return NextResponse.json({ data: invitation })
      }

      case 'reject': {
        if (!supabaseAdmin) {
          return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
        }

        const invitation = await rejectInvitation(token)
        await logAuditAction('Invitation Rejected', 'invitation', invitation.id, `Invitation ${token} rejected`)

        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: invitation.host_employee_id,
            title: 'Registration Rejected',
            message: `Registration for ${invitation.visitor_name} has been rejected`,
            type: 'appointment_rejected',
          })

        return NextResponse.json({ data: invitation })
      }

      case 'cancel': {
        const invitation = await getInvitationByToken(token)
        if (!invitation) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
        }

        await cancelInvitation(token)
        await logAuditAction('Invitation Cancelled', 'invitation', invitation.id, `Invitation ${token} cancelled`)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
