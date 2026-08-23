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
    return NextResponse.json({ success: true, data: [] })
  }

  const { data: visits, error } = await supabaseAdmin
    .from('visits')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('employee_id', hostEmployeeId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, message: error.message, error: '' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: visits || [] })
}
