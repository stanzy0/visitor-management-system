import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getHostAppointments, createHostAppointment, updateHostAppointment, deleteHostAppointment } from '@/lib/server/host'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const appointments = await getHostAppointments(employeeId)
    return NextResponse.json({ success: true, data: appointments })
  } catch (err) {
    console.error('Host appointments error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const appointment = await createHostAppointment(employeeId, body)
    return NextResponse.json({ success: true, data: appointment }, { status: 201 })
  } catch (err) {
    console.error('Create appointment error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, updates } = body
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const appointment = await updateHostAppointment(id, employeeId, updates)
    return NextResponse.json({ success: true, data: appointment })
  } catch (err) {
    console.error('Update appointment error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const employeeId = request.headers.get('x-employee-id') || 'default'

    if (!id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    await deleteHostAppointment(id, employeeId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete appointment error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
