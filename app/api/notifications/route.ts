import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, getNotificationStats, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications } from '@/lib/server/notification-service'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const filters = {
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      read: searchParams.get('read') || 'all',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      sortOrder: (searchParams.get('sortOrder') as 'newest' | 'oldest') || 'newest',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    }

    const result = await getNotifications(filters, user.id, user.role)
    const stats = await getNotificationStats(user.id, user.role)
    const unreadCount = await getUnreadCount(user.id, user.role)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
      stats,
      unreadCount,
    })
  } catch (err) {
    console.error('Notifications fetch error:', err)
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
      const { deleteReadNotifications } = await import('@/lib/server/notification-service')
      const success = await deleteReadNotifications(user.id, user.role)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
  } catch (err) {
    console.error('Notification delete error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
