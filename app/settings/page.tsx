'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('settings')) {
        window.location.href = '/unauthorized'
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h2>
          <p className="text-gray-500">The Settings page is under development.</p>
        </div>
      </div>
    </div>
  )
}