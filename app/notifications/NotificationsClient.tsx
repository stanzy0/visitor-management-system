'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCcw } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client/api'
import type { Notification, NotificationFilters } from '@/lib/types/notification'
import NotificationCard from '@/components/notifications/NotificationCard'
import NotificationFiltersComponent from '@/components/notifications/NotificationFilters'

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<NotificationFilters>({
    search: '',
    type: 'all',
    priority: 'all',
    read: 'all',
    dateFrom: '',
    dateTo: '',
  })

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.type !== 'all') params.set('type', filters.type)
      if (filters.priority !== 'all') params.set('priority', filters.priority)
      if (filters.read !== 'all') params.set('read', filters.read)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const res = await fetch(`/api/notifications?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }
      const json = await res.json()
      if (res.ok) {
        setNotifications(json.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' }),
    })
    fetchNotifications()
  }

  const handleMarkAllAsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'mark_all_read' }),
    })
    fetchNotifications()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE', headers: await getAuthHeaders() })
    fetchNotifications()
  }

  const handleClearRead = async () => {
    await fetch('/api/notifications?clear_read=true', { method: 'DELETE', headers: await getAuthHeaders() })
    fetchNotifications()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">View and manage all notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[52px]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]"
          >
            Mark All Read
          </button>
          <button
            onClick={handleClearRead}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 min-h-[52px]"
          >
            Clear Read
          </button>
        </div>
      </div>

      <NotificationFiltersComponent filters={filters} onFilterChange={setFilters} />

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center text-gray-500">
          <p className="text-lg">No notifications found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
