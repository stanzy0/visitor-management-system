import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/server/email'
import type { EmailTemplate } from '@/lib/email/types'
import { createAdminNotification, createHostEmployeeNotification } from '@/lib/notifications'
import { logAuditAction } from '@/lib/server/audit'
import QRCode from 'qrcode'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s()-]{7,20}$/

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const trimmedEmail = String(email).trim()
    const trimmedPhone = String(phone).trim()
    if (!EMAIL_RE.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (!PHONE_RE.test(trimmedPhone)) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    if (visit_date < today) {
      return NextResponse.json({ error: 'Visit date cannot be in the past' }, { status: 400 })
    }

    if (expected_duration && Number(expected_duration) <= 0) {
      return NextResponse.json({ error: 'Expected duration must be greater than 0' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const regNumber = `REG-${Date.now().toString(36).toUpperCase()}`

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, department, office_location, user_id')
      .eq('id', employee_id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Invalid host employee' }, { status: 400 })
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
      })
      .select()
      .single()

    if (visitorError || !visitor) {
      return NextResponse.json({ error: visitorError?.message || 'Failed to create visitor' }, { status: 500 })
    }

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
      return NextResponse.json({ error: visitError?.message || 'Failed to create visit' }, { status: 500 })
    }

    if (doc_number) {
      await supabaseAdmin.from('visitor_documents').insert({
        visitor_id: visitor.id,
        document_type: doc_type || 'National ID',
        document_number: doc_number,
        issuing_country: issuing_country || null,
        expiry_date: expiry_date || null,
        file_url: doc_front_url || null,
        verification_status: 'Pending',
      })
    }

    await sendEmail({
      to: trimmedEmail,
      recipientName: full_name,
      subject: `Registration Submitted - ${regNumber}`,
      template: 'registration_submitted',
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

    await createAdminNotification(
      'New Online Registration',
      `${full_name} has submitted a public registration (${regNumber}) for ${visit_date}.`,
      'info',
      'visit',
      visit.id
    )

    if (employee.user_id) {
      await createHostEmployeeNotification(
        employee.id,
        'New Visitor Registration',
        `${full_name} has registered to visit you on ${visit_date}.`,
        'visitor',
        'visit',
        visit.id
      )
    }

    await logAuditAction('Public Registration Submitted', 'visit', visit.id, `Public registration ${regNumber} submitted by ${full_name}`)

    return NextResponse.json({ success: true, data: { registrationNumber: regNumber, visitId: visit.id } }, { status: 201 })
  } catch (err) {
    console.error('Public registration error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
