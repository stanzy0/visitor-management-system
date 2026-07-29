import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Employee, EmployeeFormData } from '@/lib/types/employee'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ data: data as Employee })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = (await request.json()) as Partial<EmployeeFormData> & {
      department_id?: string | null
      position_id?: string | null
      office_location_id?: string | null
    }

    const updateData: any = {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      department: body.department || null,
      position: body.position || null,
      office_location: body.office_location || null,
    }

    if (body.department_id) {
      const { data: dept } = await supabaseAdmin
        .from('departments')
        .select('name')
        .eq('id', body.department_id)
        .single()
      if (dept) updateData.department = dept.name
    } else if (body.department === null) {
      updateData.department = null
    }

    if (body.position_id) {
      const { data: pos } = await supabaseAdmin
        .from('positions')
        .select('title')
        .eq('id', body.position_id)
        .single()
      if (pos) updateData.position = pos.title
    } else if (body.position === null) {
      updateData.position = null
    }

    if (body.office_location_id) {
      const { data: loc } = await supabaseAdmin
        .from('office_locations')
        .select('display_name, name')
        .eq('id', body.office_location_id)
        .single()
      if (loc) updateData.office_location = loc.display_name || loc.name
    } else if (body.office_location === null) {
      updateData.office_location = null
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update employee' }, { status: 400 })
    }

    return NextResponse.json({ data: data as Employee })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
