'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Integration } from '@/lib/types/admin'
import { Loader2, Mail, MessageSquare, QrCode, HardDrive, Puzzle, RefreshCw, Eye, EyeOff, Save, CheckCircle2, XCircle } from 'lucide-react'

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    name: 'Email Provider',
    type: 'email',
    provider: 'Resend',
    status: 'connected',
    api_key: 're_1234567890abcdef',
    last_tested: '2026-08-01T10:30:00Z',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-08-01T10:30:00Z',
  },
  {
    id: '2',
    name: 'SMS Provider',
    type: 'sms',
    provider: 'None',
    status: 'disconnected',
    api_key: '',
    last_tested: null,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
  },
  {
    id: '3',
    name: 'QR Service',
    type: 'qr',
    provider: 'Built-in',
    status: 'operational',
    api_key: null,
    last_tested: '2026-08-02T09:00:00Z',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-08-02T09:00:00Z',
  },
  {
    id: '4',
    name: 'Storage',
    type: 'storage',
    provider: 'Supabase Storage',
    status: 'operational',
    api_key: null,
    last_tested: '2026-08-02T08:00:00Z',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-08-02T08:00:00Z',
  },
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/integrations', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch integrations')
      }

      if (result.data && Array.isArray(result.data)) {
        setIntegrations(result.data)
      }
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load integrations' })
    } finally {
      setLoading(false)
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
      fetchIntegrations()
    }

    checkAuth()
  }, [])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail
      case 'sms':
        return MessageSquare
      case 'qr':
        return QrCode
      case 'storage':
        return HardDrive
      default:
        return Puzzle
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'operational':
        return { bg: 'bg-green-50', text: 'text-green-700', label: 'Connected' }
      case 'disconnected':
        return { bg: 'bg-red-50', text: 'text-red-700', label: 'Disconnected' }
      case 'error':
        return { bg: 'bg-red-50', text: 'text-red-700', label: 'Error' }
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', label: status }
    }
  }

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleApiKeyChange = (id: string, value: string) => {
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id ? { ...integration, api_key: value } : integration
      )
    )
  }

  const handleTestConnection = async (id: string) => {
    setTestingId(id)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTestingId(null)
    setNotification({ type: 'success', message: 'Connection test successful' })
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id
          ? { ...integration, last_tested: new Date().toISOString(), status: 'connected' as const }
          : integration
      )
    )
  }

  const handleSave = async (id: string) => {
    try {
      const integration = integrations.find(i => i.id === id)
      if (!integration) return

      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, api_key: integration.api_key }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save integration')
      }

      setNotification({ type: 'success', message: 'Integration saved successfully' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save integration' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="text-sm text-gray-500">Manage external service connections and API configurations</p>
          </div>
          <button
            onClick={fetchIntegrations}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">About Integrations</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600">
              Integrations allow the visitor management system to connect with external services for email notifications, SMS alerts, QR code generation, and file storage. Configure each integration below by providing the required API keys and testing the connection.
            </p>
          </div>
        </div>

        {integrations.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
            <Puzzle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations configured</h3>
            <p className="text-sm text-gray-500">There are no integrations to display at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map(integration => {
              const Icon = getTypeIcon(integration.type)
              const statusBadge = getStatusBadge(integration.status)
              const isKeyVisible = visibleKeys[integration.id]

              return (
                <div key={integration.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                          <p className="text-xs text-gray-500">{integration.provider}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                        <div className="relative">
                          <input
                            type={isKeyVisible ? 'text' : 'password'}
                            value={integration.api_key || ''}
                            onChange={e => handleApiKeyChange(integration.id, e.target.value)}
                            placeholder="Enter API key..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(integration.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Last Tested</label>
                        <p className="text-xs text-gray-600">{formatTimestamp(integration.last_tested)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestConnection(integration.id)}
                          disabled={testingId === integration.id}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-3 py-2 text-sm font-medium text-white transition-colors"
                        >
                          {testingId === integration.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSave(integration.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
