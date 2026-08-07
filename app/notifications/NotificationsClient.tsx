'use client'

import { useState, useEffect, useMemo } from 'react'
import { RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Notification, NotificationFilters } from '@/lib/types/notification'
import NotificationCard from '@/components/notifications/NotificationCard'
import NotificationFiltersComponent from '@/components/notifications/NotificationFilters'
import { useNotifications } from '@/contexts/NotificationContext'

const ITEMS_PER_PAGE = 20

export default function NotificationsClient() {
  const { notifications, loading, refresh, markAsRead, markAllAsRead, deleteNotification, clearRead } = useNotifications()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<NotificationFilters>({
    search: '',
    type: 'all',
    read: 'all',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: ITEMS_PER_PAGE,
    sortOrder: 'newest',
  })

  const filtered = useMemo(() => {
    let result = [...notifications]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q))
    }

    if (filters.type !== 'all') {
      result = result.filter(n => n.type === filters.type)
    }

    if (filters.read !== 'all') {
      result = result.filter(n => n.is_read === (filters.read === 'read'))
    }

    if (filters.dateFrom) {
      result = result.filter(n => n.created_at >= filters.dateFrom)
    }

    if (filters.dateTo) {
      result = result.filter(n => n.created_at <= filters.dateTo)
    }

    result.sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return filters.sortOrder === 'oldest' ? da - db : db - da
    })

    return result
  }, [notifications, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / (filters.limit || ITEMS_PER_PAGE)))
  const paginated = filtered.slice(((filters.page || 1) - 1) * (filters.limit || ITEMS_PER_PAGE), (filters.page || 1) * (filters.limit || ITEMS_PER_PAGE))
  const total = filtered.length

  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.type, filters.read, filters.dateFrom, filters.dateTo, filters.sortOrder])

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  const handleClearRead = async () => {
    await clearRead()
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
            onClick={refresh}
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
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center text-gray-500">
          <p className="text-lg">No notifications found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * (filters.limit || ITEMS_PER_PAGE)) + 1} to {Math.min(page * (filters.limit || ITEMS_PER_PAGE), total)} of {total} notifications
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
