'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Trash2, CheckCheck } from 'lucide-react'
import type { Notification } from '@/lib/types/notification'
import { useNotifications } from '@/contexts/NotificationContext'

interface NotificationPanelProps {
  onClose: () => void
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter()
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, clearRead } = useNotifications()
  const [showAll, setShowAll] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const displayedNotifications = showAll ? notifications : notifications.filter(n => !n.is_read)
  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '—'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 86400000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

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

  const handleClearRead = async () => {
    setActionLoading(true)
    await clearRead()
    setActionLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px] disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" />
                Mark All Read
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAll(false)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${!showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All
            </button>
          </div>
          <button
            onClick={handleClearRead}
            disabled={actionLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px] disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Clear Read
          </button>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No notifications to display</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.type === 'success' && '✓'}
                      {notification.type === 'warning' && '⚠'}
                      {notification.type === 'error' && '✕'}
                      {notification.type === 'visitor' && '👤'}
                      {notification.type === 'appointment' && '📅'}
                      {notification.type === 'employee' && '👨‍💼'}
                      {notification.type === 'system' && '⚙'}
                      {(notification.type === 'watchlist_match' || notification.type === 'watchlist_override') && '✋'}
                      {(notification.type === 'watchlist_added' || notification.type === 'watchlist_updated') && '➕'}
                      {(!notification.is_read && !['success', 'warning', 'error', 'visitor', 'appointment', 'employee', 'system', 'watchlist_match', 'watchlist_added', 'watchlist_updated', 'watchlist_override'].includes(notification.type)) && '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[32px] disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[32px] disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button
            onClick={() => { router.push('/notifications') }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]"
          >
            View All Notifications
          </button>
        </div>
      </div>
    </div>
  )
}