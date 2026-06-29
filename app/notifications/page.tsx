'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { Search, Loader2, Check, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict, isToday, isThisWeek, format } from 'date-fns'
import { Notification } from '@/lib/notifications'

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

const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'today' | 'week'>('all')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const user = await getCurrentUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)
    setUserRole(user.role)

    const { data: userRoleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()

    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)

    if (userRoleData?.role) {
      query = query.or(`user_id.eq.${user.id},recipient_role.eq.${userRoleData.role}`)
    }

    const { data, error } = await query
    if (error) {
      showNotification('error', error.message)
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }, [showNotification])

  const setupRealtime = useCallback(() => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('notifications-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification | null
          const oldNotif = payload.old as Notification | null

          if (payload.eventType === 'INSERT' && newNotif) {
            if (userId && userRole && (newNotif.user_id === userId || newNotif.recipient_role === userRole)) {
              setNotifications(prev => [newNotif, ...prev].slice(0, 50))
            }
          } else if (payload.eventType === 'UPDATE' && newNotif) {
            setNotifications(prev => prev.map(n => n.id === newNotif.id ? newNotif : n))
          } else if (payload.eventType === 'DELETE' && oldNotif) {
            setNotifications(prev => prev.filter(n => n.id !== oldNotif.id))
          }
        }
      )
      .subscribe()
  }, [userId, userRole])

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const hasPermission = PERMISSIONS[user.role]?.includes('dashboard') || PERMISSIONS[user.role]?.includes('appointments') || PERMISSIONS[user.role]?.includes('visits')
      if (!hasPermission) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchNotifications()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [fetchNotifications, setupRealtime])

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) {
      showNotification('error', error.message)
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
  }

  const markAllAsRead = async () => {
    if (!userId || !userRole) return

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false).or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
    if (error) {
      showNotification('error', error.message)
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      showNotification('success', 'All notifications marked as read')
    }
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      showNotification('error', error.message)
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase())

    if (filter === 'unread') return matchesSearch && !n.is_read
    if (filter === 'read') return matchesSearch && n.is_read
    if (filter === 'today') return matchesSearch && isToday(new Date(n.created_at))
    if (filter === 'week') return matchesSearch && isThisWeek(new Date(n.created_at))
    return matchesSearch
  })

  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(notification)
    return acc
  }, {} as Record<string, Notification[]>)

  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => b.localeCompare(a))

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchInputClasses}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read' | 'today' | 'week')}
              className={selectClasses}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
            <button
              onClick={markAllAsRead}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Mark All Read
            </button>
          </div>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  {groupedNotifications[date].map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{typeIcons[notification.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
