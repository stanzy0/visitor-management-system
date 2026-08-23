import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface AvailabilityResponse {
  status: 'Available' | 'Unavailable'
  message: string
  disabled: boolean
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')

    if (!employee_id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, office_location')
      .eq('id', employee_id)
      .single()

    if (!employee) {
      return NextResponse.json({ status: 'Unavailable', message: 'Employee not found.', disabled: true } as AvailabilityResponse)
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
