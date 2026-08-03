import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getOffices, createOffice, updateOffice, deleteOffice } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const offices = await getOffices()
    return NextResponse.json({ success: true, data: offices })
  } catch (err) {
    console.error('Fetch offices error:', err)
    return NextResponse.json({ error: 'Failed to fetch offices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { name, building, department, floor, room, is_active } = body

    if (!name || !building) {
      return NextResponse.json({ error: 'Office name and building are required' }, { status: 400 })
    }

    const office = await createOffice({ name, building, department, floor, room, is_active })
    return NextResponse.json({ success: true, data: office }, { status: 201 })
  } catch (err) {
    console.error('Create office error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create office' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, name, building, department, floor, room, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Office ID is required' }, { status: 400 })
    }

    const office = await updateOffice(id, { name, building, department, floor, room, is_active })
    return NextResponse.json({ success: true, data: office })
  } catch (err) {
    console.error('Update office error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update office' }, { status: 500 })
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
      return NextResponse.json({ error: 'Office ID is required' }, { status: 400 })
    }

    await deleteOffice(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete office error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete office' }, { status: 500 })
  }
}
