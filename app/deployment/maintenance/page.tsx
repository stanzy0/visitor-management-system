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

  const fetchMaintenance = async () => {
    setTimeout(() => setLoading(true), 0)
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
      setTimeout(() => setLoading(false), 0)
    }
  }

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

  const toggleMaintenance = async (enabled: boolean) => {
    setTimeout(() => setSaving(true), 0)
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
      setTimeout(() => setSaving(false), 0)
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
      <div className="min-h-screen bg-[#0B0F08] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F08]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Maintenance Mode</h1>
            <p className="text-sm text-[#9A9F87]">Control system availability</p>
          </div>
          <button onClick={fetchMaintenance} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#9A9F87] hover:bg-[#4B5320]/10">
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
                <h2 className="text-lg font-semibold text-[#F5F5DC]">
                  {maintenance?.enabled ? 'Maintenance Mode Active' : 'System Operational'}
                </h2>
                <p className="text-sm text-[#9A9F87] mt-1">
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
        <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#F5F5DC] mb-4">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9A9F87] mb-2">Maintenance Message</label>
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
        <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#F5F5DC] mb-4">Effects When Enabled</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F5F5DC]">Public Registration</p>
                <p className="text-xs text-[#9A9F87]">Unavailable</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F5F5DC]">Visitor Portal</p>
                <p className="text-xs text-[#9A9F87]">Unavailable</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F5F5DC]">Host Portal</p>
                <p className="text-xs text-[#9A9F87]">Read-only</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F5F5DC]">Reception</p>
                <p className="text-xs text-[#9A9F87]">Warning displayed</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F5F5DC]">Security</p>
                <p className="text-xs text-[#9A9F87]">Unaffected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


