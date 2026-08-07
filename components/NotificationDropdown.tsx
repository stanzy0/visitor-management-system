'use client'

import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import type { Notification } from '@/lib/types/notification'
import { useNotifications } from '@/contexts/NotificationContext'

const typeIcons: Record<string, string> = {
  info: '🔔',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  visitor: '👤',
  appointment: '📅',
  employee: '👔',
  system: '⚙️',
}

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [actionLoading, setActionLoading] = useState(false)

  const displayed = notifications.slice(0, 10)
  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkAsRead = async (id: string) => {
    setActionLoading(true)
    await markAsRead(id)
    setActionLoading(false)
  }

  const handleMarkAllAsRead = async () => {
    setActionLoading(true)
    await markAllAsRead()
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    await deleteNotification(id)
    setActionLoading(false)
  }

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Mark All Read
            </button>
          )}
          <a href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
            View All
          </a>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No notifications</div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {displayed.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{typeIcons[notification.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNowStrict(new Date(notification.created_at || new Date().toISOString()), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={actionLoading}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    disabled={actionLoading}
                    className="p-1 rounded hover:bg-red-50 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}