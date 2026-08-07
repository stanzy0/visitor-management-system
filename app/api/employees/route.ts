import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Employee, EmployeeFormData } from '@/lib/types/employee'

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: (data || []) as Employee[] })
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const body = (await request.json()) as EmployeeFormData & {
      department_id?: string | null
      position_id?: string | null
      office_location_id?: string | null
    }

    const insertData: any = {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone || null,
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
      if (dept) insertData.department = dept.name
    }

    if (body.position_id) {
      const { data: pos } = await supabaseAdmin
        .from('positions')
        .select('title')
        .eq('id', body.position_id)
        .single()
      if (pos) insertData.position = pos.title
    }

    if (body.office_location_id) {
      const { data: loc } = await supabaseAdmin
        .from('office_locations')
        .select('display_name, name')
        .eq('id', body.office_location_id)
        .single()
      if (loc) insertData.office_location = loc.display_name || loc.name
    }

    const tempPassword = generateTemporaryPassword()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, message: authError?.message || 'Failed to create authentication account', error: authError?.message || 'Internal server error' }, { status: 400 })
    }

    insertData.user_id = authData.user.id

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert(insertData)
      .select()
      .single()

    if (error || !data) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ success: false, message: error?.message || 'Failed to create employee', error: error?.message || 'Internal server error' }, { status: 400 })
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        role: 'Host Employee',
        must_change_password: true,
      })

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ success: false, message: roleError.message, error: roleError.message }, { status: 400 })
    }

    return NextResponse.json({ data: data as Employee, tempPassword }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
