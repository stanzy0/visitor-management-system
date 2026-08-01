import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/server/email'
import { createHostEmployeeNotification, createSystemNotification } from '@/lib/notifications'
import { logAuditAction } from '@/lib/server/audit'
import { getSystemSetting } from '@/lib/server/settings'
import { getPortalUrl } from '@/lib/utils/portal-url'
import { verifyBadgeQR } from '@/lib/qrcode-verification'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist'])
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
        console.error('[Badge Creation Error - Public Registration]', {
          reason: 'badge_insert_failed',
          visit_id,
          registration_number: visit.registration_number,
          error: badgeError?.message,
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json({ error: 'Failed to create badge' }, { status: 500 })
      }

      if (!badge.qr_token || !badge.badge_number) {
        console.error('[Badge Creation Error - Public Registration]', {
          reason: 'missing_qr_token_or_badge_number',
          visit_id,
          registration_number: visit.registration_number,
          badge_id: badge.id,
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json({ error: 'Badge creation failed: missing qr_token' }, { status: 500 })
      }

      const { error: updateError } = await supabaseAdmin
        .from('visits')
        .update({ status: 'approved' })
        .eq('id', visit_id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update visit status' }, { status: 500 })
      }

      const portalUrl = getPortalUrl(badge.qr_token)
      const qrDataUrl = await QRCode.toDataURL(portalUrl, { width: 300, margin: 2 })

      const qrVerification = await verifyBadgeQR(badge.id, badge.qr_token)
      if (!qrVerification.valid) {
        console.error('[Badge Creation Error - Public Reg QR Verification Failed]', {
          badge_number: badge.badge_number,
          qr_token: badge.qr_token,
          error: qrVerification.error,
          visit_id,
          registration_number: visit.registration_number,
          timestamp: new Date().toISOString(),
        })

        await supabaseAdmin
          .from('visitor_badges')
          .delete()
          .eq('id', badge.id)

        return NextResponse.json(
          { error: `QR verification failed: ${qrVerification.error}` },
          { status: 500 }
        )
      }

      console.log('[Badge Created - Public Registration]', {
        badge_number: badge.badge_number,
        qr_token: badge.qr_token,
        portal_url: portalUrl,
        visit_id,
        registration_number: visit.registration_number,
        visitor_id: visitor?.id,
        visitor_name: visitor?.full_name,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      })

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
          qrCodeUrl: qrDataUrl,
          portalUrl: portalUrl,
          badgeNumber: badge.badge_number,
          orgName: 'AFCSC Visitor Management',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })

      if (employee?.email) {
        await sendEmail({
          to: employee.email,
          recipientName: employee.full_name || 'Host',
          subject: `Visitor Approval Notification - ${visit.registration_number}`,
          template: 'registration_approved',
          data: {
            visitorName: visitor?.full_name || 'Visitor',
            registrationNumber: visit.registration_number,
            date: visit.visit_date || new Date().toISOString().split('T')[0],
            arrivalTime: visit.arrival_time || 'TBD',
            hostName: employee?.full_name || 'Host',
            location: employee?.office_location || 'Reception',
            purpose: visit.purpose || 'Visit',
            company: visitor?.visitor_organization || 'N/A',
            badgeNumber: badge.badge_number,
            qrCodeUrl: qrDataUrl,
            orgName: 'AFCSC Visitor Management',
          },
          relatedType: 'visit',
          relatedId: visit_id,
        })
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
        subject: `Registration Declined - ${visit.registration_number}`,
        template: 'registration_rejected',
        data: {
          visitorName: visitor?.full_name || 'Visitor',
          registrationNumber: visit.registration_number,
          date: visit.visit_date || new Date().toISOString().split('T')[0],
          hostName: employee?.full_name || 'Host',
          reason: reason || 'Not specified',
          orgName: 'AFCSC Visitor Management',
        },
        relatedType: 'visit',
        relatedId: visit_id,
      })

      await logAuditAction('Public Registration Rejected', 'visit', visit_id, `Registration ${visit.registration_number} rejected. Reason: ${reason || 'None'}`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 })
  } catch (err) {
    console.error('[Public Registrations API] Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    console.log('STEP 1 - Checking if visits table exists and is accessible')

    const { data: visits, error: visitsError } = await supabaseAdmin
      .from('visits')
      .select('*')
      .eq('source', 'public')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    console.log('STEP 1 OK - Visits query completed')

    if (visitsError) {
      console.error('[Public Registrations API] Visits query error:', {
        message: visitsError.message,
        details: visitsError.details,
        hint: visitsError.hint,
        code: visitsError.code,
      })

      if (visitsError.message?.includes('relation "public.visits" does not exist') ||
          visitsError.message?.toLowerCase().includes('relation "visits" does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing table: visits',
            source: 'visits query',
            table: 'visits',
            column: null,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: visitsError.message,
          details: visitsError.details,
          hint: visitsError.hint,
          code: visitsError.code,
          source: 'visits query',
        },
        { status: 500 }
      )
    }

    if (!visits || visits.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    console.log('STEP 2 - Checking visitors table')

    const visitorIds = [...new Set(visits.map((v: any) => v.visitor_id).filter(Boolean))]
    const employeeIds = [...new Set(visits.map((v: any) => v.employee_id).filter(Boolean))]

    const { data: visitors, error: visitorsError } = visitorIds.length
      ? await supabaseAdmin
          .from('visitors')
          .select('id, full_name, email, phone')
          .in('id', visitorIds)
      : { data: [], error: null }

    console.log('STEP 2 OK - Visitors query completed')

    if (visitorsError) {
      console.error('[Public Registrations API] Visitors query error:', {
        message: visitorsError.message,
        details: visitorsError.details,
        hint: visitorsError.hint,
        code: visitorsError.code,
      })

      if (visitorsError.message?.includes('relation "public.visitors" does not exist') ||
          visitorsError.message?.toLowerCase().includes('relation "visitors" does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing table: visitors',
            source: 'visitors query',
            table: 'visitors',
            column: null,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: visitorsError.message,
          details: visitorsError.details,
          hint: visitorsError.hint,
          code: visitorsError.code,
          source: 'visitors query',
        },
        { status: 500 }
      )
    }

    console.log('STEP 3 - Checking employees table')

    const { data: employees, error: employeesError } = employeeIds.length
      ? await supabaseAdmin
          .from('employees')
          .select('id, full_name, department')
          .in('id', employeeIds)
      : { data: [], error: null }

    console.log('STEP 3 OK - Employees query completed')

    if (employeesError) {
      console.error('[Public Registrations API] Employees query error:', {
        message: employeesError.message,
        details: employeesError.details,
        hint: employeesError.hint,
        code: employeesError.code,
      })

      if (employeesError.message?.includes('relation "public.employees" does not exist') ||
          employeesError.message?.toLowerCase().includes('relation "employees" does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing table: employees',
            source: 'employees query',
            table: 'employees',
            column: null,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: employeesError.message,
          details: employeesError.details,
          hint: employeesError.hint,
          code: employeesError.code,
          source: 'employees query',
        },
        { status: 500 }
      )
    }

    const visitorsMap = new Map((visitors || []).map((v: any) => [v.id, v]))
    const employeesMap = new Map((employees || []).map((e: any) => [e.id, e]))

    const enrichedVisits = visits.map((visit: any) => ({
      ...visit,
      visitor: visitorsMap.get(visit.visitor_id) || null,
      employee: employeesMap.get(visit.employee_id) || null,
    }))

    return NextResponse.json({ success: true, data: enrichedVisits })
  } catch (err) {
    console.error('[Public Registrations API] CRITICAL ERROR:', err)
    console.error('[Public Registrations API] Stack:', err instanceof Error ? err.stack : 'No stack trace')

    const errorMessage = err instanceof Error ? err.message : 'Internal server error'
    const errorStack = err instanceof Error ? err.stack : undefined

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
