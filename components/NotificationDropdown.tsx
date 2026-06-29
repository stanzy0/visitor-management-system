'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Check, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Notification } from '@/lib/notifications'

interface NotificationDropdownProps {
  onClose: () => void
}

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

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      setUserRole(user.role)

      const { data: userRoleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()

      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10)

      if (userRoleData?.role) {
        query = query.or(`user_id.eq.${user.id},recipient_role.eq.${userRoleData.role}`)
      }

      const { data, error } = await query
      if (!error) {
        setNotifications(data || [])
      }
      setLoading(false)
    }

    fetchNotifications()

    realtimeChannel.current = supabase
      .channel('dropdown-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as Notification
          if (userId && userRole && (notif.user_id === userId || notif.recipient_role === userRole)) {
            setNotifications(prev => [notif, ...prev].slice(0, 10))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as Notification
          if (userId && userRole && (notif.user_id === userId || notif.recipient_role === userRole)) {
            setNotifications(prev => prev.map(n => n.id === notif.id ? notif : n))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.old as Notification
          if (userId && userRole && (notif.user_id === userId || notif.recipient_role === userRole)) {
            setNotifications(prev => prev.filter(n => n.id !== notif.id))
          }
        }
      )
      .subscribe()

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [onClose, userId, userRole])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    if (!userId || !userRole) return
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false).or(`user_id.eq.${userId},recipient_role.eq.${userRole}`)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark All Read
          </button>
          <a href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
            View All
          </a>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No notifications</div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
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
                      <Check className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1 rounded hover:bg-red-50"
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
