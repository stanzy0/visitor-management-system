import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateVisitQRCode } from '@/lib/qrcode'
import { createVisitStatusNotification, getVisitDetails } from '@/lib/server/notifications'
import { logAuditAction } from '@/lib/server/audit'
import { sendEmail } from '@/lib/server/email'
import type { Visit } from '@/lib/types/visit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'Visit ID required', error: '' }, { status: 400 })
    }

    const body = await request.json()
    const { status, visitorName: clientVisitorName, hostName: clientHostName, hostUserId: clientHostUserId } = body
    const newStatus = status || 'approved'

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const updates: Record<string, unknown> = { status: newStatus }
    const currentTime = new Date().toISOString()
    if (newStatus === 'checked_in') updates.check_in_time = currentTime
    if (newStatus === 'checked_out') updates.check_out_time = currentTime

    const { data: updatedVisit, error } = await supabaseAdmin
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        visitor:visitors!inner(full_name, email, visitor_organization),
        employee:employees(full_name, user_id, office_location)
      `)
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: 'Update failed' }, { status: 500 })
    }

    if (!updatedVisit) {
      return NextResponse.json({ success: false, message: 'Visit not found', error: '' }, { status: 404 })
    }

    const visitorName = updatedVisit.visitor?.full_name || clientVisitorName || 'Unknown Visitor'
    const hostName = updatedVisit.employee?.full_name || clientHostName || 'Unknown Host'
    const hostUserId = updatedVisit.employee?.user_id || clientHostUserId || null

    await logAuditAction('Visit Status Changed', 'visit', id, `${visitorName}'s visit ${newStatus}`)

    if (newStatus === 'approved') {
      const qrCodeDataUrl = await generateVisitQRCode(id)
      await supabaseAdmin.from('visits').update({ qr_code: qrCodeDataUrl }).eq('id', id)

      const visitorEmail = updatedVisit.visitor?.email || ''
      if (visitorEmail) {
        try {
          console.log('Approval email started')
          console.log('Recipient:', visitorEmail)

          await sendEmail({
            to: visitorEmail,
            recipientName: visitorName,
            subject: `Registration Approved - ${updatedVisit.registration_number || id}`,
            template: 'registration_approved',
            data: {
              visitorName: visitorName,
              registrationNumber: updatedVisit.registration_number || '',
              date: (updatedVisit.visit_date as string | undefined) || new Date().toISOString().split('T')[0],
              arrivalTime: (updatedVisit.arrival_time as string | undefined) || 'TBD',
              hostName: hostName,
              location: (updatedVisit.employee?.office_location as string | undefined) || 'Reception',
              badgeNumber: 'N/A',
              qrCodeUrl: qrCodeDataUrl,
            },
            relatedType: 'visit',
            relatedId: id,
          })

          console.log('Approval email success')
        } catch (error) {
          console.error('Approval email failed:', error)
        }
      } else {
        console.warn('Approval email skipped: visitor email missing', { visitId: id, visitorName })
      }
    }

    const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    await createVisitStatusNotification(
      newStatus,
      visitorName,
      hostName,
      id,
      hostUserId,
      newStatus === 'checked_in' ? displayTime : null
    )

    return NextResponse.json({ success: true, data: updatedVisit })
  } catch (err) {
    console.error('Visit status update error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
