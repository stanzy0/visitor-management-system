'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { Loader2, ShieldAlert, Users, Clock } from 'lucide-react'

export default function GateActivityPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('scanner')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (authChecking || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gate Activity</h1>
          <p className="text-sm text-gray-500">Live gate monitoring and visitor tracking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Visitors Inside</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-500">Waiting at Gate</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Security Alerts</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gate Activity Map</h3>
          <p className="text-gray-500">Live gate activity visualization will be displayed here. This module is ready for future integration with gate hardware and real-time visitor tracking systems.</p>
        </div>
      </div>
    </div>
  )
}
