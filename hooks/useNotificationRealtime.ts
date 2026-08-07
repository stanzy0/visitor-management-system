'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotificationRealtime(onNewNotification?: () => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const callbackRef = useRef(onNewNotification)

  useEffect(() => {
    callbackRef.current = onNewNotification
  }, [onNewNotification])

  useEffect(() => {
    if (!supabase) return

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = userRole?.role

      channelRef.current = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const notification = payload.new as {
              user_id: string | null
              recipient_role: string | null
            } | null

            if (!notification) return

            const matchesUser = notification.user_id === user.id
            const matchesRole = !!role && notification.recipient_role === role

            if (matchesUser || matchesRole) {
              if (process.env.NODE_ENV === 'development') {
                console.log('Realtime Notification Received:', notification)
              }
              callbackRef.current?.()
            }
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])
}
