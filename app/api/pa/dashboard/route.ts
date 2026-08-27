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
  const isAdmin = userRole.role === 'Admin'

  if (!hostEmployeeId && !isAdmin) {
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

  const { data: hostEmployee, error: hostError } = isAdmin
    ? { data: null, error: null }
    : await supabaseAdmin
        .from('employees')
        .select('id, full_name, position, department')
        .eq('id', hostEmployeeId!)
        .single()

  if (hostError) {
    return NextResponse.json({ success: false, message: 'Failed to load host employee', error: hostError.message }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || 'today'

  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (range) {
    case '7days':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
      break
    case '30days':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0)
      break
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    case 'today':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      break
  }

  const startStr = startDate.toISOString()
  const endStr = endDate.toISOString()

  let visitsQuery = supabaseAdmin
    .from('visits')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .gte('created_at', startStr)
    .lte('created_at', endStr)
    .order('created_at', { ascending: false })

  const { data: todaysVisits, error: visitsError } = !isAdmin && hostEmployeeId
    ? await visitsQuery.eq('employee_id', hostEmployeeId)
    : await visitsQuery

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
      range,
    },
  })
}
