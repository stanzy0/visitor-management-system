import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getAppointmentById, updateAppointmentStatus } from '@/lib/server/appointments'
import { logAuditAction } from '@/lib/server/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Appointment ID and status are required' }, { status: 400 })
    }

    const appointment = await getAppointmentById(id)
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const updated = await updateAppointmentStatus(id, status)
    await logAuditAction('Appointment Updated', 'appointment', id, `Appointment ${updated.appointment_number} marked as ${status}`)

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Appointment check-in error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update appointment' }, { status: 500 })
  }
}
