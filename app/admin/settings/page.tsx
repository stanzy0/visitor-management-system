'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Save, RefreshCw, Shield, UserCheck, Clock, Calendar, Mail } from 'lucide-react'

interface SettingRow {
  id?: string
  key: string
  value: any
  category: string
  description?: string
  is_sensitive?: boolean
}

const GENERAL_SETTINGS: SettingRow[] = [
  { key: 'org_name', value: 'AFCSC', category: 'general', description: 'Institution display name' },
  { key: 'org_logo', value: '', category: 'general', description: 'Logo URL' },
  { key: 'org_address', value: '', category: 'general', description: 'Address' },
  { key: 'org_phone', value: '', category: 'general', description: 'Phone number' },
  { key: 'org_email', value: '', category: 'general', description: 'Email address' },
  { key: 'org_website', value: '', category: 'general', description: 'Website URL' },
]

const SECURITY_SETTINGS: SettingRow[] = [
  { key: 'session_timeout', value: 30, category: 'security', description: 'Session timeout in minutes' },
  { key: 'password_expiry_days', value: 90, category: 'security', description: 'Password expiry in days' },
  { key: 'max_login_attempts', value: 6, category: 'security', description: 'Max login attempts' },
  { key: 'mfa_enabled', value: true, category: 'security', description: 'Enable MFA' },
  { key: 'lockout_duration', value: 30, category: 'security', description: 'Lockout duration in minutes' },
]

const REGISTRATION_SETTINGS: SettingRow[] = [
  { key: 'allow_public_registration', value: true, category: 'registration', description: 'Allow public self-registration' },
  { key: 'require_host_approval', value: true, category: 'registration', description: 'Require host approval for registrations' },
  { key: 'require_document_verification', value: false, category: 'registration', description: 'Require document verification' },
  { key: 'require_badge', value: true, category: 'registration', description: 'Require badge issuance' },
  { key: 'auto_expire_visitors', value: true, category: 'registration', description: 'Auto expire visitors after hours' },
]

const APPOINTMENT_SETTINGS: SettingRow[] = [
  { key: 'working_hours_start', value: '08:00', category: 'appointment', description: 'Working hours start' },
  { key: 'working_hours_end', value: '18:00', category: 'appointment', description: 'Working hours end' },
  { key: 'appointment_duration', value: 30, category: 'appointment', description: 'Default appointment duration in minutes' },
  { key: 'max_advance_booking', value: 30, category: 'appointment', description: 'Maximum advance booking in days' },
]

const EMAIL_NOTIFICATION_SETTINGS: SettingRow[] = [
  { key: 'email_notifications_enabled', value: true, category: 'email', description: 'Enable email notifications' },
  { key: 'registration_submitted_emails', value: true, category: 'email', description: 'Send email when visitor registration is submitted' },
  { key: 'registration_approved_emails', value: true, category: 'email', description: 'Send email when registration is approved' },
  { key: 'registration_rejected_emails', value: true, category: 'email', description: 'Send email when registration is rejected' },
  { key: 'host_checkin_notifications', value: true, category: 'email', description: 'Notify host when visitor checks in' },
  { key: 'host_checkout_notifications', value: true, category: 'email', description: 'Notify host when visitor checks out' },
  { key: 'badge_ready_emails', value: true, category: 'email', description: 'Send email when badge is ready' },
]

type SettingTab = 'general' | 'security' | 'registration' | 'appointment' | 'email'

export default function AdminSettingsPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [settings, setSettings] = useState<Record<string, SettingRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<SettingTab>('general')

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/settings', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch settings')
      }

      const map: Record<string, SettingRow> = {}
      const allDefaults = [...GENERAL_SETTINGS, ...SECURITY_SETTINGS, ...REGISTRATION_SETTINGS, ...APPOINTMENT_SETTINGS, ...EMAIL_NOTIFICATION_SETTINGS]
      allDefaults.forEach((def) => {
        const existing = result.data?.find((s: SettingRow) => s.key === def.key)
        map[def.key] = existing || { ...def }
      })

      setSettings(map)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load settings' })
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

      const entries = Object.values(settings).map((s) => ({
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
        is_sensitive: s.is_sensitive || false,
      }))

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(entries),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to save settings')
      }

      setNotification({ type: 'success', message: 'Settings saved successfully' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
  }

  const tabs = [
    { id: 'general' as SettingTab, label: 'General', icon: Shield },
    { id: 'security' as SettingTab, label: 'Security', icon: Shield },
    { id: 'registration' as SettingTab, label: 'Registration', icon: UserCheck },
    { id: 'appointment' as SettingTab, label: 'Appointments', icon: Calendar },
    { id: 'email' as SettingTab, label: 'Email Notifications', icon: Mail },
  ]

  const getSettingsForTab = (tab: SettingTab) => {
    switch (tab) {
      case 'general':
        return GENERAL_SETTINGS
      case 'security':
        return SECURITY_SETTINGS
      case 'registration':
        return REGISTRATION_SETTINGS
      case 'appointment':
        return APPOINTMENT_SETTINGS
      case 'email':
        return EMAIL_NOTIFICATION_SETTINGS
    }
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
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500">Configure system-wide settings</p>
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

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">{activeTab.replace('-', ' ')} Settings</h3>
            </div>
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                getSettingsForTab(activeTab).map((setting) => (
                  <div key={setting.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{setting.description || setting.key}</label>
                    {typeof settings[setting.key]?.value === 'boolean' ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings[setting.key]?.value || false}
                          onChange={(e) => updateSetting(setting.key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{settings[setting.key]?.value ? 'Enabled' : 'Disabled'}</span>
                      </label>
                    ) : (
                      <input
                        type={typeof settings[setting.key]?.value === 'number' ? 'number' : 'text'}
                        value={settings[setting.key]?.value || ''}
                        onChange={(e) => updateSetting(setting.key, typeof settings[setting.key]?.value === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
