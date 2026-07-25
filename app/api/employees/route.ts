import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Employee, EmployeeFormData } from '@/lib/types/employee'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: (data || []) as Employee[] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !PERMISSIONS[user.role]?.includes('employees')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const body = (await request.json()) as EmployeeFormData

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert(body)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create employee' }, { status: 400 })
    }

    return NextResponse.json({ data: data as Employee }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
