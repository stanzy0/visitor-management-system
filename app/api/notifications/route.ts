import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, getNotificationStats, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteReadNotifications } from '@/lib/server/notifications'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      priority: searchParams.get('priority') || 'all',
      read: searchParams.get('read') || 'all',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
    }

    const notifications = await getNotifications(filters, user.id, user.role)
    const stats = await getNotificationStats(user.id, user.role)
    const unreadCount = await getUnreadCount(user.id, user.role)

    return NextResponse.json({ success: true, data: notifications, stats, unreadCount })
  } catch (err) {
    console.error('Notifications fetch error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, message, type, priority, recipient_role, related_type, related_id, action_url } = body

    if (!title || !message) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const { createNotification } = await import('@/lib/notifications')
    const notification = await createNotification(
      title,
      message,
      type || 'info',
      user.id,
      recipient_role || null,
      related_type || null,
      related_id || null,
      priority || 'Normal',
      action_url || null
    )

    if (!notification) {
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: notification }, { status: 201 })
  } catch (err) {
    console.error('Notification creation error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clearRead = searchParams.get('clear_read')

    if (clearRead === 'true') {
      const { deleteReadNotifications } = await import('@/lib/server/notifications')
      const success = await deleteReadNotifications(user.id, user.role)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
  } catch (err) {
    console.error('Notification delete error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
