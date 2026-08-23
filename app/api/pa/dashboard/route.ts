import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth'
import { getHostEmployeeIdForPA } from '@/lib/server/pa-helpers'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized', error: '' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
  }

  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!userRole || (userRole.role !== 'PA_TO_DIRECTOR' && userRole.role !== 'PA_TO_CI')) {
    return NextResponse.json({ success: false, message: 'Access denied', error: '' }, { status: 403 })
  }

  const hostEmployeeId = await getHostEmployeeIdForPA(user.id, userRole.role)
  if (!hostEmployeeId) {
    return NextResponse.json({
      success: true,
      data: {
        visitsToday: [],
        pendingVisits: [],
        approvedVisits: [],
        checkedInVisits: [],
        checkedOutVisits: [],
        hostEmployee: null,
      },
    })
  }

  const { data: hostEmployee, error: hostError } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, position, department')
    .eq('id', hostEmployeeId)
    .single()

  if (hostError) {
    return NextResponse.json({ success: false, message: 'Failed to load host employee', error: hostError.message }, { status: 500 })
  }

  // "Today" is derived from created_at using the same date-range convention the
  // rest of the application uses (Reception, Host, Reports dashboards). The
  // visits table has no visit_date column; scheduled_date is not reliably
  // populated, so created_at is the canonical, populated field for "today".
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59.999`

  // Single source of truth: every visit created today for the assigned host,
  // across all statuses. All counters and the visitor list are derived from this
  // one dataset so they can never diverge.
  const { data: todaysVisits, error: visitsError } = await supabaseAdmin
    .from('visits')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('employee_id', hostEmployeeId)
    .gte('created_at', todayStart)
    .lt('created_at', todayEnd)
    .order('created_at', { ascending: false })

  if (visitsError) {
    return NextResponse.json({ success: false, message: 'Failed to load visits', error: visitsError.message }, { status: 500 })
  }

  const all = todaysVisits || []
  const pendingVisits = all.filter((v) => v.status === 'pending')
  const approvedVisits = all.filter((v) => v.status === 'approved')
  const checkedInVisits = all.filter((v) => v.status === 'checked_in')
  const checkedOutVisits = all.filter((v) => v.status === 'checked_out')

  return NextResponse.json({
    success: true,
    data: {
      visitsToday: all,
      pendingVisits,
      approvedVisits,
      checkedInVisits,
      checkedOutVisits,
      hostEmployee: hostEmployee || null,
    },
  })
}
