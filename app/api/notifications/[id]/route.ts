import { NextRequest, NextResponse } from 'next/server'
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteReadNotifications } from '@/lib/server/notifications'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationId } = body

    if (action === 'mark_all_read') {
      const success = await markAllNotificationsAsRead(user.id, user.role)
      return NextResponse.json({ success })
    }

    if (action === 'mark_read' && notificationId) {
      const success = await markNotificationAsRead(notificationId)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Notification update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const clearRead = searchParams.get('clear_read')

    if (clearRead === 'true') {
      const success = await deleteReadNotifications(user.id, user.role)
      return NextResponse.json({ success })
    }

    if (notificationId) {
      const success = await deleteNotification(notificationId)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    console.error('Notification delete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
