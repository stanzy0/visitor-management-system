import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword } from '@/lib/server/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const users = await getAllUsers()
    return NextResponse.json({ success: true, data: users })
  } catch (err) {
    console.error('Fetch users error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { email, full_name, role, password } = body

    if (!email || !full_name || !role || !password) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const user = await createUser({ email, full_name, role, password })
    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { user_id, full_name, email, role } = body

    if (!user_id) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    await updateUser(user_id, { full_name, email, role })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    await deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
