'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface MaintenanceMode {
  enabled: boolean
  message: string | null
  started_at: string | null
}

export default function MaintenanceModePage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchMaintenance()
    }
    checkAuth()
  }, [])

  const fetchMaintenance = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deployment?section=maintenance')
      const json = await res.json()
      if (json.success) {
        setMaintenance(json.data)
        setMessage(json.data.message || '')
      }
    } catch (err) {
      console.error('Error fetching maintenance mode:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMaintenance = async (enabled: boolean) => {
    setSaving(true)
    try {
      await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_maintenance', enabled, message }),
      })
      fetchMaintenance()
    } catch (err) {
      console.error('Error toggling maintenance mode:', err)
    } finally {
      setSaving(false)
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance Mode</h1>
            <p className="text-sm text-gray-500">Control system availability</p>
          </div>
          <button onClick={fetchMaintenance} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Current Status */}
        <div className={`rounded-xl border p-6 ${maintenance?.enabled ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {maintenance?.enabled ? (
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {maintenance?.enabled ? 'Maintenance Mode Active' : 'System Operational'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {maintenance?.enabled
                    ? `Started: ${maintenance.started_at ? new Date(maintenance.started_at).toLocaleString() : 'Unknown'}`
                    : 'All systems are operational'}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${maintenance?.enabled ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {maintenance?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter maintenance message to display to users..."
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleMaintenance(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                Enable Maintenance Mode
              </button>
              <button
                onClick={() => toggleMaintenance(false)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Disable Maintenance Mode
              </button>
            </div>
          </div>
        </div>

        {/* Effects */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Effects When Enabled</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Public Registration</p>
                <p className="text-xs text-gray-500">Unavailable</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Visitor Portal</p>
                <p className="text-xs text-gray-500">Unavailable</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Host Portal</p>
                <p className="text-xs text-gray-500">Read-only</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Reception</p>
                <p className="text-xs text-gray-500">Warning displayed</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Security</p>
                <p className="text-xs text-gray-500">Unaffected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
