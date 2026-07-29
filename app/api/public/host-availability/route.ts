import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type AvailabilityStatus = 'Available' | 'Busy' | 'In Meeting' | 'On Leave' | 'Off Duty' | 'Training' | 'Restricted' | 'Unavailable'

interface AvailabilityResponse {
  status: AvailabilityStatus
  message: string
  nextAvailableAt?: string
  alternatives?: Array<{ time: string; availableAt: string }>
  disabled: boolean
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isWeekday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day !== 0 && day !== 6
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    const duration = parseInt(searchParams.get('duration') || '60', 10)

    if (!employee_id || !date || !time) {
      return NextResponse.json({ error: 'employee_id, date, and time are required' }, { status: 400 })
    }

    const startMinutes = timeToMinutes(time)
    const endMinutes = startMinutes + duration

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, office_location')
      .eq('id', employee_id)
      .single()

    console.log('[host-availability] employee lookup', { employee_id, employee })

    if (!employee) {
      return NextResponse.json({ status: 'Unavailable', message: 'Employee not found.', disabled: true } as AvailabilityResponse)
    }

    // TODO: Real availability requires a leave/schedule/roster table.
    // The current data model only has appointments and visits.
    // employees.status is an employment flag, not a daily availability calendar.
    // Until a leave table exists, default to Available and rely on appointment overlap checks below.
    const availabilityStatus: AvailabilityStatus = 'Available'

    // NOTE: The branches below for Restricted, On Leave, Training, Unavailable, Off Duty,
    // and In Meeting are intentionally kept as placeholders. Once a leave/schedule table
    // is added, set availabilityStatus from that data and these checks will become active.

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_time, expected_duration, status')
      .eq('employee_id', employee_id)
      .eq('appointment_date', date)
      .neq('status', 'Cancelled')
      .neq('status', 'No Show')

    const overlaps = (appointments || []).filter((apt) => {
      const aptStart = timeToMinutes(apt.appointment_time)
      const aptEnd = aptStart + (apt.expected_duration || 30)
      return startMinutes < aptEnd && endMinutes > aptStart
    })

    if (overlaps.length > 0) {
      const earliestEnd = overlaps
        .map((apt) => timeToMinutes(apt.appointment_time) + (apt.expected_duration || 30))
        .sort((a, b) => a - b)[0]

      const nextAvailableAt = minutesToTime(earliestEnd)
      const alternatives: Array<{ time: string; availableAt: string }> = []
      const slots = [earliestEnd, earliestEnd + 30, earliestEnd + 60]

      for (const slot of slots) {
        if (slot + duration <= timeToMinutes('16:00')) {
          const hasConflict = (appointments || []).some((apt) => {
            const aptStart = timeToMinutes(apt.appointment_time)
            const aptEnd = aptStart + (apt.expected_duration || 30)
            return slot < aptEnd && slot + duration > aptStart
          })

          if (!hasConflict) {
            alternatives.push({ time: minutesToTime(slot), availableAt: minutesToTime(slot + duration) })
          }
        }
      }

      return NextResponse.json({
        status: 'Busy',
        message: `Host is busy during the selected period. Available again at ${nextAvailableAt}.`,
        nextAvailableAt,
        alternatives,
        disabled: true,
      } as AvailabilityResponse)
    }

    return NextResponse.json({
      status: 'Available',
      message: 'Host is available during the selected period.',
      disabled: false,
    } as AvailabilityResponse)
  } catch (err) {
    console.error('Host availability check error:', err)
    return NextResponse.json({ status: 'Unavailable', message: 'Failed to check availability.', disabled: true } as AvailabilityResponse)
  }
}
