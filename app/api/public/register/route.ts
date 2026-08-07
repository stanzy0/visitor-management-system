import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/server/email'
import type { EmailTemplate } from '@/lib/email/types'
import { createAdminNotification, createHostNotification } from '@/lib/server/notification-service'
import { logAuditAction } from '@/lib/server/audit'
import QRCode from 'qrcode'
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s()-]{7,20}$/
const SUPABASE_STORAGE_URL = 'https://phkmhrncmkvfgnraiyug.supabase.co/storage/v1/object/public/'

function log(regNumber: string, message: string, data?: Record<string, unknown>) {
  console.error(`[PUBLIC-REGISTRATION] ${regNumber} | ${message}`, data ? JSON.stringify(data) : '')
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  let regNumber = ''
  let visitorId = ''
  let visitId = ''
  let badgeId = ''
  let badgeNumber = ''
  let qrToken = ''

  try {
    const body = await request.json()

    const {
      full_name,
      phone,
      email,
      visitor_organization,
      nationality,
      visitor_address,
      gender,
      photo_url,
      doc_type,
      doc_number,
      issuing_country,
      expiry_date,
      doc_front_url,
      doc_back_url,
      employee_id,
      purpose,
      visit_date,
      arrival_time,
      expected_duration,
      has_vehicle,
      registration_number,
      vehicle_type,
      vehicle_color,
      emergency_name,
      emergency_relationship,
      emergency_phone,
      notes,
      visitor_type,
    } = body

    if (!full_name || !phone || !email || !employee_id || !purpose || !visit_date) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const trimmedEmail = String(email).trim()
    const trimmedPhone = String(phone).trim()
    if (!EMAIL_RE.test(trimmedEmail)) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }
    if (!PHONE_RE.test(trimmedPhone)) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    if (visit_date < today) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (expected_duration && Number(expected_duration) <= 0) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    regNumber = `REG-${Date.now().toString(36).toUpperCase()}`
    log(regNumber, 'REGISTRATION STARTED', { full_name, email: trimmedEmail })

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, email, department, office_location, user_id')
      .eq('id', employee_id)
      .single()

    if (!employee) {
      log(regNumber, 'FAILED: Invalid host employee')
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    log(regNumber, 'Employee found', { employeeId: employee.id })

    if (doc_number && doc_front_url) {
      const { count } = await supabaseAdmin
        .from('visitor_documents')
        .select('id', { count: 'exact', head: true })
        .eq('document_number', doc_number)

      if (count && count > 0) {
        log(regNumber, 'FAILED: Duplicate document number', { doc_number })
        return NextResponse.json(
          { error: 'This document has already been registered' },
          { status: 409 }
        )
      }
    }

    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from('visitors')
      .insert({
        full_name,
        email: trimmedEmail,
        phone: trimmedPhone,
        visitor_organization: visitor_organization || null,
        visitor_address: visitor_address || null,
        nationality: nationality || null,
        gender: gender || null,
        photo_url: photo_url || null,
        emergency_contact: emergency_phone || null,
        vehicle_plate: has_vehicle ? registration_number : null,
        vehicle_type: has_vehicle ? vehicle_type : null,
        visitor_type: visitor_type || 'Visitor',
      })
      .select()
      .single()

    if (visitorError || !visitor) {
      log(regNumber, 'FAILED: Could not create visitor', { error: visitorError?.message })
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    visitorId = visitor.id
    log(regNumber, 'Visitor created', { visitorId })

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .insert({
        visitor_id: visitor.id,
        employee_id: employee.id,
        purpose,
        status: 'pending',
        source: 'public',
        registration_number: regNumber,
        visitor_type: visitor_type || 'Visitor',
        notes: notes || null,
        appointment_id: null,
      })
      .select()
      .single()

    if (visitError || !visit) {
      log(regNumber, 'FAILED: Could not create visit', { error: visitError?.message })
      await supabaseAdmin.from('visitors').delete().eq('id', visitor.id)
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
    }

    visitId = visit.id
    log(regNumber, 'Visit created', { visitId })

    if (doc_number && doc_front_url) {
      const isValidStorageUrl = doc_front_url.startsWith(SUPABASE_STORAGE_URL)
      if (!isValidStorageUrl) {
        log(regNumber, 'FAILED: Invalid document URL', { doc_front_url })
        await supabaseAdmin.from('visits').delete().eq('id', visit.id)
        await supabaseAdmin.from('visitors').delete().eq('id', visitor.id)
        return NextResponse.json(
          { error: 'Invalid document URL. Only Supabase Storage URLs are accepted.' },
          { status: 400 }
        )
      }

const { error: docError } = await supabaseAdmin.from('visitor_documents').insert({
      visitor_id: visitor.id,
      document_type: doc_type || 'National ID',
      document_number: doc_number,
      issuing_country: issuing_country || null,
      expiry_date: expiry_date || null,
      front_image_url: doc_front_url,
      file_url: doc_front_url,
      back_image_url: doc_back_url || null,
      verified: false,
      verification_status: 'Pending',
    })

      if (docError) {
        log(regNumber, 'FAILED: Could not save document', { error: docError.message })
        await supabaseAdmin.from('visits').delete().eq('id', visit.id)
        await supabaseAdmin.from('visitors').delete().eq('id', visitor.id)
        return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
      }

      log(regNumber, 'Document saved', { doc_number, doc_type })
    }
    
    console.log("STEP 6");
    const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    console.log("STEP 1");

    try {
      const badgeNumberRes = await supabaseAdmin.rpc("generate_visitor_badge_number");

      console.log("STEP 2");
      console.log(badgeNumberRes);

      if (badgeNumberRes.error) {
        console.error("RPC ERROR:", badgeNumberRes.error);
        throw badgeNumberRes.error;
      }

      badgeNumber = badgeNumberRes.data;

      console.log("STEP 3");
    } catch (e) {
      console.error("RPC THREW:", e);
      throw e;
    }

    console.log("STEP 4");
    const { data: badge, error: badgeError } = await supabaseAdmin
      .from('visitor_badges')
      .insert({
        visit_id: visit.id,
        badge_number: badgeNumber,
        qr_token: qrToken,
        badge_status: 'Active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (badgeError || !badge) {
      log(regNumber, 'FAILED: Could not create badge', { error: badgeError?.message })
      await supabaseAdmin.from('visits').delete().eq('id', visit.id)
      await supabaseAdmin.from('visitors').delete().eq('id', visitor.id)
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
    }

    console.log("STEP 5");

    badgeId = badge.id
    log(regNumber, 'Badge created', { badgeId, badgeNumber })

    console.log("STEP 7");
    let visitorEmailSent = false
    let hostEmailSent = false

    const visitorResult = await sendEmail({
      to: trimmedEmail,
      recipientName: full_name,
      subject: `Registration Submitted - ${regNumber}`,
      template: 'registration_submitted' as EmailTemplate,
      data: {
        visitorName: full_name,
        registrationNumber: regNumber,
        visitDate: visit_date,
        arrivalTime: arrival_time || 'TBD',
        hostName: employee.full_name,
        location: employee.office_location || 'Reception',
        orgName: 'AFCSC Visitor Management',
      },
      relatedType: 'visit',
      relatedId: visit.id,
    })

    console.log("EMAIL RESULT:", visitorResult)
    
    visitorEmailSent = visitorResult.success

    await createAdminNotification(
      'New Online Registration',
      `${full_name} has submitted a public registration (${regNumber}) for ${visit_date}.`,
      'info',
      'visit',
      visit.id
    )
    log(regNumber, 'Admin notification created')

    if (employee.email) {
      const hostResult = await sendEmail({
        to: employee.email,
        recipientName: employee.full_name,
        subject: `Visitor Registration - ${full_name}`,
        template: 'visitor_arrival',
        data: {
          visitorName: full_name,
          organization: visitor_organization || 'N/A',
          purpose,
          date: visit_date,
          time: arrival_time || 'TBD',
          badgeNumber,
          location: employee.office_location || 'Reception',
        },
        relatedType: 'visit',
        relatedId: visit.id,
      })

      console.log("EMAIL RESULT:", hostResult)
      hostEmailSent = hostResult.success

      if (hostEmailSent) {
        await createHostNotification(
          employee.user_id,
          'Visitor Registration Received',
          `${full_name} has submitted a visitor registration (${regNumber}) for ${visit_date}.`,
          'visitor',
          'visit',
          visit.id
        )
        log(regNumber, 'Host notification created')
      }
    } else {
      log(regNumber, 'No host email - employee has no email address')
    }

    try {
      await logAuditAction('Public Registration Submitted', 'visit', visit.id, `Public registration ${regNumber} submitted by ${full_name}`)
      log(regNumber, 'Audit logged')
    } catch (auditErr) {
      console.error(`[PUBLIC-REGISTRATION] ${regNumber} | Audit log failed`, auditErr)
    }

    log(regNumber, 'REGISTRATION COMPLETED', {
      visitorId,
      visitId,
      badgeId,
      badgeNumber,
      qrToken,
      visitorEmailSent,
      hostEmailSent,
    })

    return NextResponse.json(
      {
        success: true,
        status: 'SUCCESS',
        data: {
          registrationNumber: regNumber,
          visitId,
          badgeId,
          badgeNumber,
          qrToken,
          visitorEmailSent,
          hostEmailSent,
        },
      },
      { status: 201 }
    )
    } catch (err) {
    console.error(`[PUBLIC-REGISTRATION] ${regNumber || 'UNKNOWN'} | FATAL ERROR`);
    console.error(err);

    if (visitorId && supabaseAdmin) {
      try {
        await supabaseAdmin.from('visitors').delete().eq('id', visitorId)
      } catch {
        // ignore cleanup errors
      }
    }

    if (visitId && supabaseAdmin) {
      try {
        await supabaseAdmin.from('visits').delete().eq('id', visitId)
      } catch {
        // ignore cleanup errors
      }
    }

    if (badgeId && supabaseAdmin) {
      try {
        await supabaseAdmin.from('visitor_badges').delete().eq('id', badgeId)
      } catch {
        // ignore cleanup errors
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : String(err),
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}