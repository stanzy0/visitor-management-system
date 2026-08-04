import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Security', 'Admin', 'Receptionist'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const today = new Date().toISOString().split('T')[0]
    const startDate = start || `${today}T00:00:00`
    const endDate = end || new Date().toISOString()

    const [
      insideRes,
      exitedTodayRes,
      avgDurationRes,
      badgeLossesRes,
      propertyIncidentsRes,
      approvalsRes,
      denialsRes,
    ] = await Promise.all([
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'checked_out').gte('check_out_time', startDate).lte('check_out_time', endDate),
      supabaseAdmin.from('visits').select('expected_duration, check_in_time, check_out_time').eq('status', 'checked_out').gte('check_out_time', startDate).lte('check_out_time', endDate),
      supabaseAdmin.from('visitor_badges').select('id', { count: 'exact', head: true }).eq('badge_status', 'Lost').gte('updated_at', startDate).lte('updated_at', endDate),
      supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Confiscated').gte('created_at', startDate).lte('created_at', endDate),
      supabaseAdmin.from('gate_activities').select('id', { count: 'exact', head: true }).eq('decision', 'approved').gte('created_at', startDate).lte('created_at', endDate),
      supabaseAdmin.from('gate_activities').select('id', { count: 'exact', head: true }).eq('decision', 'denied').gte('created_at', startDate).lte('created_at', endDate),
    ])

    const durations = (avgDurationRes.data || [])
      .filter((v: any) => v.check_in_time && v.check_out_time)
      .map((v: any) => (new Date(v.check_out_time).getTime() - new Date(v.check_in_time).getTime()) / 60000)

    const report = {
      visitorsCurrentlyInside: insideRes.count ?? 0,
      visitorsExitedToday: exitedTodayRes.count ?? 0,
      averageVisitDuration: durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0,
      badgeLosses: badgeLossesRes.count ?? 0,
      propertyIncidents: propertyIncidentsRes.count ?? 0,
      approvals: approvalsRes.count ?? 0,
      denials: denialsRes.count ?? 0,
    }

    return NextResponse.json({ success: true, data: report })
  } catch (err) {
    console.error('Exit reports error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
