import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyItems, createPropertyItem } from '@/lib/server/property'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId') || undefined
    const visitorId = searchParams.get('visitorId') || undefined
    const employeeId = searchParams.get('employeeId') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    let effectiveEmployeeId = employeeId
    if (!effectiveEmployeeId && authResult.userEmail) {
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
      }
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', authResult.userEmail)
        .single()
      if (employee) {
        effectiveEmployeeId = employee.id
      }
    }

    const items = await getPropertyItems({ visitId, visitorId, employeeId: effectiveEmployeeId, status, search })
    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error('Fetch property items error:', err)
    return NextResponse.json({ error: 'Failed to fetch property items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { visit_id, visitor_id, employee_id, ...itemData } = body

    if (!visit_id || !visitor_id || !employee_id) {
      return NextResponse.json({ error: 'visit_id, visitor_id, and employee_id are required' }, { status: 400 })
    }

    const item = await createPropertyItem(
      {
        visit_id,
        visitor_id,
        employee_id,
        ...itemData,
      },
      authResult.userEmail || 'system'
    )

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (err) {
    console.error('Create property item error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create property item' }, { status: 500 })
  }
}
