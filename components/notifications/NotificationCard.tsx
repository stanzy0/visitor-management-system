'use client'

import { Check, Trash2, ExternalLink } from 'lucide-react'
import type { Notification } from '@/lib/types/notification'

interface NotificationCardProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export default function NotificationCard({ notification, onMarkAsRead, onDelete }: NotificationCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="text-red-600 text-lg">🔴</span>
      case 'High':
        return <span className="text-orange-600 text-lg">🟠</span>
      case 'Normal':
        return <span className="text-blue-600 text-lg">🔵</span>
      default:
        return <span className="text-gray-400 text-lg">⚪</span>
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
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours < 24) return `${hours} hours ago`
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`rounded-lg border p-4 ${notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getPriorityIcon(notification.priority)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
              {notification.title}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatTime(notification.created_at)}
            </span>
          </div>
          <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {!notification.is_read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px]"
              >
                <Check className="h-3 w-3" />
                Mark Read
              </button>
            )}
            {notification.action_url && (
              <a
                href={notification.action_url}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[36px]"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[36px]"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
