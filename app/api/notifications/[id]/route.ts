import { NextRequest, NextResponse } from 'next/server'
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/lib/server/notifications'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body
    const { id } = await params

    if (action === 'mark_all_read') {
      const success = await markAllNotificationsAsRead(user.id, user.role)
      return NextResponse.json({ success })
    }

    if (action === 'mark_read') {
      const success = await markNotificationAsRead(id)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Notification update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const success = await deleteNotification(id)
    return NextResponse.json({ success })
  } catch (err) {
    console.error('Notification delete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
