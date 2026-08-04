import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyItemById, updatePropertyItem, confiscatePropertyItem, releasePropertyItem, addPropertyHistory } from '@/lib/server/property'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const item = await getPropertyItemById(id)

    if (!item) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: item })
  } catch (err) {
    console.error('Fetch property item error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const item = await updatePropertyItem(id, body, authResult.userEmail || 'system', body.reason)
    return NextResponse.json({ success: true, data: item })
  } catch (err) {
    console.error('Update property item error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from('property_items')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete property item error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
