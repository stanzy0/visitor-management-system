import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getVisitForBadgePreview, getBadgeTemplates } from '@/lib/server/badge-preview'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import { getPortalUrl } from '@/lib/utils/portal-url'
import QRCode from 'qrcode'
import { sendEmail } from '@/lib/server/email'
import { createHostEmployeeNotification, createSystemNotification } from '@/lib/server/notifications'
import { getDocumentVerifications } from '@/lib/server/document-verification'

export async function GET(request: NextRequest, { params }: { params: Promise<{ visitId: string }> }) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { visitId } = await params

    const visit = await getVisitForBadgePreview(visitId)
    if (!visit) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    const templates = await getBadgeTemplates()

    return NextResponse.json({ success: true, data: { visit, templates } })
  } catch (err) {
    console.error('Badge preview fetch error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ visitId: string }> }) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { visitId } = await params
    const body = await request.json()
    const { action, reason, template_id, orientation, expires_at } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: visit, error: fetchError } = await supabaseAdmin
      .from('visits')
      .select('*, visitor:visitors(*), employee:employees(*)')
      .eq('id', visitId)
      .single()

    if (fetchError || !visit) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    const visitor = Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor
    const employee = Array.isArray(visit.employee) ? visit.employee[0] : visit.employee

    if (action === 'approve') {
      const verifications = await getDocumentVerifications({ verification_status: 'all', search: '', document_type: '', date_from: '', date_to: '' }, 100, 0)
      const pendingDocs = verifications.data.filter(v => v.visit_id === visitId && ['Pending', 'Rejected', 'Replacement Requested'].includes(v.verification_status))

      if (pendingDocs.length > 0) {
        return NextResponse.json({
          error: 'Cannot approve badge. Some documents are pending verification or have been rejected. Please review all documents before approving.',
          pendingDocuments: pendingDocs
        }, { status: 400 })
      }

      const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')

      const badgeData: Record<string, unknown> = {
        visit_id: visitId,
        badge_number: `BADGE-${Date.now().toString(36).toUpperCase()}`,
        qr_token: qrToken,
        badge_status: 'Active',
        expires_at: expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      if (template_id) {
        badgeData.template_id = template_id
      }

      const { data: badge, error: badgeError } = await supabaseAdmin
        .from('visitor_badges')
        .insert(badgeData)
        .select()
        .single()

      if (badgeError || !badge) {
        return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
      }

      const { error: updateError } = await supabaseAdmin
        .from('visits')
        .update({ status: 'approved' })
        .eq('id', visitId)

      if (updateError) {
        return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
      }

        const portalUrl = getPortalUrl(badge.qr_token)
        const qrDataUrl = await QRCode.toDataURL(portalUrl, { width: 300, margin: 2 })

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
        relatedId: visitId,
      })

      if (employee?.user_id) {
        await createHostEmployeeNotification(
          employee.id,
          'Visitor Registration Approved',
          `${visitor?.full_name || 'A visitor'}'s registration has been approved for ${visit.visit_date || 'today'}.`,
          'visitor',
          'visit',
          visitId
        )
      }

      await createSystemNotification(
        'Registration Approved',
        `Public registration ${visit.registration_number} for ${visitor?.full_name || 'visitor'} has been approved.`,
        'success',
        'visit',
        visitId
      )

      await logAuditAction('Badge Approved', 'visit', visitId, `Registration ${visit.registration_number} approved and badge ${badge.badge_number} generated`)
      await logAuditAction('Badge Generated', 'badge', badge.id, `Badge ${badge.badge_number} generated for ${visitor?.full_name || 'visitor'}`)

      return NextResponse.json({ success: true, data: { badge_number: badge.badge_number, qr_token: badge.qr_token } })
    }

    if (action === 'reject') {
      const { error: updateError } = await supabaseAdmin
        .from('visits')
        .update({ status: 'rejected', rejection_reason: reason || null })
        .eq('id', visitId)

      if (updateError) {
        return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
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
        relatedId: visitId,
      })

      await logAuditAction('Badge Rejected', 'visit', visitId, `Registration ${visit.registration_number} rejected. Reason: ${reason || 'None'}`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
  } catch (err) {
    console.error('Badge preview action error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
