'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Save, Mail, Send, Check } from 'lucide-react'

interface EmailSetting {
  id?: string
  key: string
  value: any
  category: string
  description?: string
}

export default function AdminEmailPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [settings, setSettings] = useState<Record<string, EmailSetting>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/email', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch email settings')
      }

      const map: Record<string, EmailSetting> = {}
      result.data?.forEach((s: EmailSetting) => {
        map[s.key] = s
      })

      setSettings(map)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load email settings' })
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
      setUserRole(user.role)
      fetchSettings()
    }
    checkAuth()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const body = Object.values(settings).map((s) => ({
        key: s.key,
        value: s.value,
        category: s.category,
      }))

      const res = await fetch('/api/admin/email', {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to save email settings')
      }

      setNotification({ type: 'success', message: 'Email settings saved successfully' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save email settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      setNotification({ type: 'error', message: 'Please enter a test email address' })
      return
    }

    setTesting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: testEmail }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to send test email')
      }

      setNotification({ type: 'success', message: result.message || 'Test email sent successfully' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send test email' })
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
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
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
            <p className="text-sm text-gray-500">Configure email provider and notifications</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                SMTP Configuration
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={settings.sender_name?.value || ''}
                  onChange={(e) => updateSetting('sender_name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                <input
                  type="email"
                  value={settings.sender_email?.value || ''}
                  onChange={(e) => updateSetting('sender_email', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.reply_to_email?.value || ''}
                  onChange={(e) => updateSetting('reply_to_email', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            </div>
            <div className="p-4 space-y-4">
              {[
                { key: 'enable_emails', label: 'Enable All Emails' },
                { key: 'enable_appointment_emails', label: 'Appointment Emails' },
                { key: 'enable_reminder_emails', label: 'Reminder Emails' },
                { key: 'enable_emergency_emails', label: 'Emergency Emails' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={settings[item.key]?.value || false}
                    onChange={(e) => updateSetting(item.key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Send Test Email</h3>
            <p className="text-sm text-gray-500">Verify your email configuration</p>
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Test Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
