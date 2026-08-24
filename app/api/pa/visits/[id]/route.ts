import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth'
import { getAssignedHostEmployeeForPA } from '@/lib/server/pa-helpers'

export async function GET(
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

  const { data: visit, error } = await supabaseAdmin
    .from('visits')
    .select(`
      *,
      visitor:visitors(*),
      employee:employees(*)
    `)
    .eq('id', id)
    .single()

  if (error || !visit) {
    return NextResponse.json({ success: false, message: 'Visit not found', error: '' }, { status: 404 })
  }

  if (!isAdmin && visit.employee_id !== hostEmployeeId) {
    return NextResponse.json({ success: false, message: 'You are not authorized to view this visitor.', error: 'forbidden' }, { status: 403 })
  }

  const { data: documents } = await supabaseAdmin
    .from('visitor_documents')
    .select('*')
    .eq('visitor_id', visit.visitor_id)

  return NextResponse.json({
    success: true,
    data: {
      ...visit,
      visitor_documents: documents || [],
    },
  })
}
