'use client'

import { useState, useEffect } from 'react'
import { X, Check, Trash2, CheckCheck, ExternalLink } from 'lucide-react'
import type { Notification } from '@/lib/types/notification'

interface NotificationPanelProps {
  onClose: () => void
  onUpdate: () => void
}

export default function NotificationPanel({ onClose, onUpdate }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [showAll])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (res.ok) {
        setNotifications(json.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' }),
    })
    fetchNotifications()
    onUpdate()
  }

  const handleMarkAllAsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    })
    fetchNotifications()
    onUpdate()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    fetchNotifications()
    onUpdate()
  }

  const handleClearRead = async () => {
    await fetch('/api/notifications?clear_read=true', { method: 'DELETE' })
    fetchNotifications()
    onUpdate()
  }

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 20)
  const unreadCount = notifications.filter(n => !n.is_read).length

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="text-red-600">🔴</span>
      case 'High':
        return <span className="text-orange-600">🟠</span>
      case 'Normal':
        return <span className="text-blue-600">🔵</span>
      default:
        return <span className="text-gray-400">⚪</span>
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
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
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px]"
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
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px]"
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
                      {getPriorityIcon(notification.priority)}
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
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[32px]"
                          >
                            <Check className="h-3 w-3" />
                            Mark Read
                          </button>
                        )}
                        {notification.action_url && (
                          <a
                            href={notification.action_url}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[32px]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[32px]"
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
            onClick={() => { setShowAll(true); onClose(); }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]"
          >
            View All Notifications
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
