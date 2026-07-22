import { NextResponse, NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { queueEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const hostId = searchParams.get('hostId')
    const date = searchParams.get('date')

    const userEmail = authResult.userEmail || ''

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    let query = supabaseAdmin
      .from('visitor_invitations')
      .select('*, host:employees(*, user:user_roles(*))')
      .order('expected_date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (hostId) {
      query = query.eq('host_employee_id', hostId)
    }

    if (date) {
      query = query.eq('expected_date', date)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitor_name, visitor_email, visitor_phone, visitor_organization, purpose, expected_date, expected_time, vehicle_required, number_of_visitors, notes } = body

    if (!visitor_name || !visitor_email || !purpose || !expected_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    let hostEmployeeId = body.host_employee_id

    if (!hostEmployeeId) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', authResult.userEmail)
        .single()

      if (!employee) {
        return NextResponse.json({ error: 'Host employee record not found' }, { status: 400 })
      }

      hostEmployeeId = employee.id
    }

    const { data: invitation, error } = await supabaseAdmin
      .from('visitor_invitations')
      .insert({
        host_employee_id: hostEmployeeId,
        visitor_name,
        visitor_email,
        visitor_phone: visitor_phone || null,
        visitor_organization: visitor_organization || null,
        purpose,
        expected_date,
        expected_time: expected_time || null,
        vehicle_required: vehicle_required || false,
        number_of_visitors: number_of_visitors || 1,
        notes: notes || null,
        created_by: authResult.userEmail,
      })
      .select()
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: error?.message || 'Failed to create invitation' }, { status: 400 })
    }

    const { data: host } = await supabaseAdmin
      .from('employees')
      .select('full_name, department')
      .eq('id', hostEmployeeId)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const registrationUrl = `${baseUrl}/register/${invitation.invitation_token}`

    void queueEmail({
      to: visitor_email,
      recipientName: visitor_name,
      subject: `You're Invited to Visit - ${expected_date}`,
      template: 'invitation_created',
      data: {
        visitorName: visitor_name,
        hostName: host?.full_name || 'Our Team',
        date: expected_date,
        time: expected_time || 'TBD',
        purpose,
        registrationUrl,
        expiresAt: new Date(invitation.expires_at).toLocaleDateString(),
      },
      relatedType: 'invitation',
      relatedId: invitation.id,
    })

    return NextResponse.json({ data: invitation }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
