import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const departments = await getDepartments()
    return NextResponse.json({ success: true, data: departments })
  } catch (err) {
    console.error('Fetch departments error:', err)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { name, head_name, building, is_active } = body

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const department = await createDepartment({ name, head_name, building, is_active })
    return NextResponse.json({ success: true, data: department }, { status: 201 })
  } catch (err) {
    console.error('Create department error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create department' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, name, head_name, building, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const department = await updateDepartment(id, { name, head_name, building, is_active })
    return NextResponse.json({ success: true, data: department })
  } catch (err) {
    console.error('Update department error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update department' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    await deleteDepartment(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete department error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete department' }, { status: 500 })
  }
}
