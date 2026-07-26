import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getAppointmentStats,
} from '@/lib/server/appointments'
import { logAuditAction } from '@/lib/client/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const id = searchParams.get('id') || undefined

    if (id) {
      const appointment = await getAppointmentById(id)
      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: appointment })
    }

    const appointments = await getAppointments(startDate, endDate)
    const stats = await getAppointmentStats(startDate, endDate)

    return NextResponse.json({ success: true, data: appointments, stats })
  } catch (err) {
    console.error('Fetch appointments error:', err)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visitor_id, employee_id, office_location, appointment_date, appointment_time, expected_duration, purpose, notes } = body

    if (!visitor_id || !employee_id || !office_location || !appointment_date || !appointment_time || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const appointment = await createAppointment(
      {
        visitor_id,
        employee_id,
        office_location,
        appointment_date,
        appointment_time,
        expected_duration: expected_duration || 30,
        purpose,
        notes: notes || null,
      },
      authResult.userEmail || 'system'
    )

    await logAuditAction('Appointment Created', 'appointment', appointment.id, `Appointment ${appointment.appointment_number} created`)

    return NextResponse.json({ success: true, data: appointment }, { status: 201 })
  } catch (err) {
    console.error('Create appointment error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create appointment' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, status, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 })
    }

    let appointment
    if (status) {
      appointment = await updateAppointmentStatus(id, status)
    } else {
      appointment = await updateAppointment(id, updates)
    }

    await logAuditAction('Appointment Updated', 'appointment', id, `Appointment ${appointment.appointment_number} updated`)

    return NextResponse.json({ success: true, data: appointment })
  } catch (err) {
    console.error('Update appointment error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 })
    }

    const appointment = await getAppointmentById(id)
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await deleteAppointment(id)
    await logAuditAction('Appointment Cancelled', 'appointment', id, `Appointment ${appointment.appointment_number} cancelled`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete appointment error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete appointment' }, { status: 500 })
  }
}
