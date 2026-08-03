'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Loader2, RefreshCw, Download, FileDown, Database, HardDrive, Shield,
  AlertTriangle, CheckCircle, XCircle, Clock, FileText, Settings,
} from 'lucide-react'

interface Backup {
  id: string
  backup_type: string
  backup_size_bytes: number | null
  status: string
  created_at: string
}

const RESTORE_OPTIONS = [
  { label: 'Entire System', value: 'full', icon: Database },
  { label: 'Database', value: 'database', icon: Database },
  { label: 'Storage', value: 'storage', icon: HardDrive },
  { label: 'Badge Templates', value: 'badge_templates', icon: Shield },
  { label: 'Notification Templates', value: 'notification_templates', icon: FileText },
  { label: 'Office Locations', value: 'office_locations', icon: Settings },
  { label: 'System Settings', value: 'system_settings', icon: Settings },
]

export default function RestoreCenterPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [backups, setBackups] = useState<Backup[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [restoreType, setRestoreType] = useState('full')
  const [confirmText, setConfirmText] = useState('')
  const [restoring, setRestoring] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchBackups = async () => {
    setTimeout(() => setLoading(true), 0)
    try {
      const res = await fetch('/api/deployment?section=backups')
      const json = await res.json()
      if (json.success) {
        setBackups(json.data.filter((b: Backup) => b.status === 'completed'))
      }
    } catch (err) {
      console.error('Error fetching backups:', err)
    } finally {
      setTimeout(() => setLoading(false), 0)
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup || confirmText !== 'RESTORE') {
      alert('Please type RESTORE to confirm')
      return
    }
    setTimeout(() => setRestoring(true), 0)
    try {
      await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backup_id: selectedBackup, restore_type: restoreType }),
      })
      fetchBackups()
    } catch (err) {
      console.error('Error restoring backup:', err)
      alert('Failed to restore backup')
    } finally {
      setTimeout(() => setRestoring(false), 0)
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
      fetchBackups()
    }
    checkAuth()
  }, [])

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
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
            <h1 className="text-2xl font-bold text-gray-900">Restore Center</h1>
            <p className="text-sm text-gray-500">Restore system from backups</p>
          </div>
          <button onClick={fetchBackups} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Warning */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Warning</h3>
              <p className="text-sm text-red-700 mt-1">Restoring will overwrite existing data. Make sure to create a backup before proceeding.</p>
            </div>
          </div>
        </div>

        {/* Restore Options */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Restore Options</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            {RESTORE_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setRestoreType(option.value)}
                  className={`rounded-xl border-2 p-4 text-center transition-colors ${restoreType === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <Icon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-900">{option.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Available Backups */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Backups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Select</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Size</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No completed backups available</td></tr>
                )}
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="radio"
                        name="backup"
                        checked={selectedBackup === backup.id}
                        onChange={() => setSelectedBackup(backup.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">{backup.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{backup.backup_type}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBytes(backup.backup_size_bytes)}</td>
                    <td className="px-4 py-3 text-gray-600">{backup.created_at ? new Date(backup.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirm Restore */}
        {selectedBackup && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Confirm Restore</h3>
            <p className="text-sm text-red-700 mb-4">
              You are about to restore <strong>{restoreType}</strong> from backup <strong>{selectedBackup.slice(0, 8)}</strong>.
              This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-red-900 mb-2">
                Type <strong>RESTORE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm"
                placeholder="RESTORE"
              />
            </div>
            <button
              onClick={handleRestore}
              disabled={restoring || confirmText !== 'RESTORE'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {restoring ? 'Restoring...' : 'Restore Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
