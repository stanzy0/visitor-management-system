import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth'
import { getAssignedHostEmployeeForPA } from '@/lib/server/pa-helpers'
import { applyVisitStatusChange, InvalidTransitionError } from '@/lib/server/visit-status'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  if (!userRole || (userRole.role !== 'PA_TO_DIRECTOR' && userRole.role !== 'PA_TO_CI' && userRole.role !== 'Admin')) {
    return NextResponse.json({ success: false, message: 'Access denied', error: '' }, { status: 403 })
  }

  const isAdmin = userRole.role === 'Admin'
  const { role, hostEmployeeId } = isAdmin
    ? { role: 'Admin', hostEmployeeId: null }
    : await getAssignedHostEmployeeForPA(user.id)

  if (!isAdmin && (!role || !hostEmployeeId)) {
    return NextResponse.json({ success: false, message: 'Access denied', error: '' }, { status: 403 })
  }

  const { data: visit, error: visitError } = await supabaseAdmin
    .from('visits')
    .select('employee_id, visitor:visitors(full_name)')
    .eq('id', id)
    .single()

  if (visitError || !visit) {
    return NextResponse.json({ success: false, message: 'Visit not found', error: '' }, { status: 404 })
  }

  if (!isAdmin && visit.employee_id !== hostEmployeeId) {
    return NextResponse.json(
      { success: false, message: 'You are not authorized to manage this visitor.', error: 'forbidden' },
      { status: 403 }
    )
  }

  const visitorFullName = (() => {
    const v = visit.visitor as unknown as Array<{ full_name?: string }> | { full_name?: string } | null
    return Array.isArray(v) ? v[0]?.full_name : v?.full_name
  })()

  try {
    const updatedVisit = await applyVisitStatusChange(id, 'approved', {
      auditAction: 'Visitor Approved',
      auditDetails: `PA (${role}) approved ${visitorFullName || 'visitor'}'s visit`,
    })

    return NextResponse.json({ success: true, data: updatedVisit })
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ success: false, message: err.message, error: 'invalid_transition' }, { status: 422 })
    }
    console.error('PA approve error:', err)
    return NextResponse.json({ success: false, message: 'Failed to approve visitor', error: 'internal' }, { status: 500 })
  }
}
