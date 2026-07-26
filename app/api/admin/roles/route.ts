import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getAdminRoles, createAdminRole, updateAdminRole, deleteAdminRole } from '@/lib/server/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const roles = await getAdminRoles()
    return NextResponse.json({ success: true, data: roles })
  } catch (err) {
    console.error('Fetch roles error:', err)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { name, description, permissions } = body

    if (!name || !permissions) {
      return NextResponse.json({ error: 'Name and permissions are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const role = await createAdminRole({ name, description, permissions })
    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (err) {
    console.error('Create role error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create role' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, name, description, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const role = await updateAdminRole(id, { name, description, permissions })
    return NextResponse.json({ success: true, data: role })
  } catch (err) {
    console.error('Update role error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update role' }, { status: 500 })
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
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    await deleteAdminRole(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete role error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete role' }, { status: 500 })
  }
}
