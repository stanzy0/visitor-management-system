'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS, UserRole } from '@/lib/auth'
import { logAuditAction } from '@/lib/audit'
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Eye,
  Palette,
  Shield,
  Bell,
  Settings as SettingsIcon,
  Building2,
  Clock,
  FileText,
  UserCheck,
  Car,
  QrCode,
  Printer,
} from 'lucide-react'

interface SettingRow {
  id?: string
  key: string
  value: any
  category: string
  description?: string
  is_sensitive?: boolean
}

const DEFAULT_SETTINGS: SettingRow[] = [
  // General
  { key: 'org_name', value: 'Organization Name', category: 'general', description: 'Organization display name' },
  { key: 'org_logo', value: '', category: 'general', description: 'Logo URL' },
  { key: 'org_address', value: '', category: 'general', description: 'Address' },
  { key: 'org_phone', value: '', category: 'general', description: 'Phone number' },
  { key: 'org_email', value: '', category: 'general', description: 'Email address' },
  { key: 'org_website', value: '', category: 'general', description: 'Website URL' },
  // Visitor Settings
  { key: 'working_hours_start', value: '08:00', category: 'visitor', description: 'Working hours start' },
  { key: 'working_hours_end', value: '18:00', category: 'visitor', description: 'Working hours end' },
  { key: 'max_visit_duration', value: 480, category: 'visitor', description: 'Max visit duration in minutes' },
  { key: 'require_appointment', value: false, category: 'visitor', description: 'Require appointment' },
  { key: 'require_photo', value: true, category: 'visitor', description: 'Require visitor photo' },
  { key: 'require_id_verification', value: false, category: 'visitor', description: 'Require ID verification' },
  { key: 'require_vehicle_registration', value: false, category: 'visitor', description: 'Require vehicle registration' },
  { key: 'auto_checkout', value: true, category: 'visitor', description: 'Auto check-out after hours' },
  { key: 'badge_expiry_hours', value: 24, category: 'visitor', description: 'Badge expiry in hours' },
  // Badge Settings
  { key: 'badge_logo', value: '', category: 'badge', description: 'Badge logo URL' },
  { key: 'badge_background', value: '#ffffff', category: 'badge', description: 'Badge background color' },
  { key: 'badge_footer', value: '', category: 'badge', description: 'Badge footer text' },
  { key: 'badge_qr_position', value: 'right', category: 'badge', description: 'QR code position' },
  // Notifications
  { key: 'notify_email', value: true, category: 'notifications', description: 'Enable email notifications' },
  { key: 'notify_inapp', value: true, category: 'notifications', description: 'Enable in-app notifications' },
  { key: 'notify_emergency', value: true, category: 'notifications', description: 'Enable emergency alerts' },
  { key: 'notify_watchlist', value: true, category: 'notifications', description: 'Enable watchlist alerts' },
  { key: 'notify_appointments', value: true, category: 'notifications', description: 'Enable appointment alerts' },
  // Security
  { key: 'session_timeout', value: 30, category: 'security', description: 'Session timeout in minutes' },
  { key: 'password_expiry_days', value: 90, category: 'security', description: 'Password expiry in days' },
  { key: 'max_login_attempts', value: 6, category: 'security', description: 'Max login attempts' },
  { key: 'force_password_change', value: false, category: 'security', description: 'Force password change on next login' },
  { key: 'auto_logout', value: true, category: 'security', description: 'Enable auto logout' },
  // Appearance
  { key: 'theme', value: 'light', category: 'appearance', description: 'UI theme' },
  { key: 'accent_color', value: '#2563eb', category: 'appearance', description: 'Accent color' },
  { key: 'sidebar_style', value: 'default', category: 'appearance', description: 'Sidebar style' },
  { key: 'compact_mode', value: false, category: 'appearance', description: 'Enable compact mode' },
]

const CATEGORIES = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'visitor', label: 'Visitor Settings', icon: UserCheck },
  { id: 'badge', label: 'Badge Settings', icon: QrCode },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'backup', label: 'Backup', icon: Download },
]

type SettingValue = string | number | boolean

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [activeCategory, setActiveCategory] = useState('general')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [lastConfigChange, setLastConfigChange] = useState<string | null>(null)
  const [lastLogin, setLastLogin] = useState<string | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user || user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchSettings()
      fetchAuditInfo()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data } = await supabase.from('system_settings').select('*')

    const map: Record<string, SettingRow> = {}
    DEFAULT_SETTINGS.forEach((def) => {
      const existing = data?.find((s) => s.key === def.key)
      map[def.key] = existing || { ...def }
    })

    setSettings(map)
    setLoading(false)
  }

  const fetchAuditInfo = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('action, created_at')
      .or('action.ilike.%Backup%,action.ilike.%Settings%,action.ilike.%Login%')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      const backup = data.find((l) => l.action.toLowerCase().includes('backup'))
      const config = data.find((l) => l.action.toLowerCase().includes('settings'))
      const login = data.find((l) => l.action.toLowerCase().includes('login'))
      setLastBackup(backup ? new Date(backup.created_at).toLocaleString() : null)
      setLastConfigChange(config ? new Date(config.created_at).toLocaleString() : null)
      setLastLogin(login ? new Date(login.created_at).toLocaleString() : null)
    }
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          fetchSettings()
        }
      )
      .subscribe()
  }

  const handleSave = async () => {
    setSaving(true)
    const user = await getCurrentUser()

    const entries = Object.values(settings).map((s) => ({
      key: s.key,
      value: s.value,
      category: s.category,
      description: s.description,
      is_sensitive: s.is_sensitive || false,
      updated_by: user?.id,
    }))

    const { error } = await supabase.from('system_settings').upsert(entries, { onConflict: 'key' })

    if (error) {
      console.error('Error saving settings:', error)
    } else {
      await logAuditAction('Settings Updated', 'system_settings', null, 'System configuration updated')
    }

    setSaving(false)
  }

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    logAuditAction('Settings Exported', 'system_settings', null, 'Configuration exported')
  }

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string)
        const newSettings = { ...settings }
        Object.entries(imported).forEach(([key, row]: [string, any]) => {
          if (newSettings[key]) {
            newSettings[key] = { ...newSettings[key], ...row }
          }
        })
        setSettings(newSettings)
        logAuditAction('Settings Imported', 'system_settings', null, 'Configuration imported')
      } catch (err) {
        console.error('Invalid settings file:', err)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const updateSetting = (key: string, value: SettingValue) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
  }

  const getSettingsByCategory = (cat: string) => {
    return Object.values(settings).filter((s) => s.category === cat)
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500">Admin configuration and preferences</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <nav className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {cat.label}
                      </button>
                    )
                  })}
                </nav>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Audit Info</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>Last Backup: {lastBackup || 'Never'}</p>
                    <p>Last Change: {lastConfigChange || 'Never'}</p>
                    <p>Last Login: {lastLogin || 'Never'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeCategory === 'backup' ? (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Export Configuration</h4>
                        <p className="text-xs text-gray-500">Download all settings as JSON</p>
                      </div>
                      <button
                        onClick={handleExportConfig}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Import Configuration</h4>
                        <p className="text-xs text-gray-500">Upload a previously exported JSON file</p>
                      </div>
                      <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Import
                        <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Download Settings JSON</h4>
                        <p className="text-xs text-gray-500">Save a copy of current configuration</p>
                      </div>
                      <button
                        onClick={handleExportConfig}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{activeCategory.replace('_', ' ')} Settings</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {getSettingsByCategory(activeCategory).map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-900">{setting.key.replace(/_/g, ' ')}</label>
                          {setting.description && <p className="text-xs text-gray-500">{setting.description}</p>}
                        </div>
                        <div className="ml-4 w-64">
                          {typeof setting.value === 'boolean' ? (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={setting.value as boolean}
                                onChange={(e) => updateSetting(setting.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          ) : typeof setting.value === 'number' ? (
                            <input
                              type="number"
                              value={setting.value as number}
                              onChange={(e) => updateSetting(setting.key, parseInt(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          ) : (
                            <input
                              type={setting.key.includes('email') ? 'email' : setting.key.includes('url') || setting.key.includes('website') ? 'url' : 'text'}
                              value={setting.value as string}
                              onChange={(e) => updateSetting(setting.key, e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
