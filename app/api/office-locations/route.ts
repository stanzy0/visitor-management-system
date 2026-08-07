import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import { createOfficeLocationNotification } from '@/lib/server/notifications'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: '' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('Fetch office locations error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { name, building, department } = body

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .insert([{ name, building: building || null, department: department || null }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: '' }, { status: 500 })
    }

    await logAuditAction('Office Location Created', 'office_location', data.id, `${name} added`)

    await createOfficeLocationNotification('created', data.id, name)

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    console.error('Create office location error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const body = await request.json()
    const { name, building, department } = body

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .update({ name, building: building || null, department: department || null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: '' }, { status: 500 })
    }

    await logAuditAction('Office Location Updated', 'office_location', id, `${name} updated`)

    await createOfficeLocationNotification('updated', id, name)

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Update office location error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
