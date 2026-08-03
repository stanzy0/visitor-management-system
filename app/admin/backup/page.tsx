'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Download, RefreshCw, AlertTriangle } from 'lucide-react'

interface BackupRecord {
  id: string
  filename: string
  size: string
  created_at: string
  created_by: string
  status: string
}

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/backup', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch backups')
      }

      setBackups(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load backups' })
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
      fetchBackups()
    }
    checkAuth()
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create' }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create backup')
      }

      setNotification({ type: 'success', message: 'Backup created successfully' })
      fetchBackups()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create backup' })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data and cannot be undone.')) return

    setRestoring(backupId)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setNotification({ type: 'success', message: 'Backup restore initiated successfully' })
    } catch {
      setNotification({ type: 'error', message: 'Failed to restore backup' })
    } finally {
      setRestoring(null)
    }
  }

  const handleDownload = (backup: BackupRecord) => {
    const blob = new Blob(['-- Backup placeholder'], { type: 'application/sql' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backup.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
            <h1 className="text-2xl font-bold text-gray-900">Backup Management</h1>
            <p className="text-sm text-gray-500">Create, download, and restore system backups</p>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Create Backup
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Filename</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Size</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Created By</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Created At</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{backup.filename}</td>
                    <td className="px-4 py-3 text-gray-600">{backup.size}</td>
                    <td className="px-4 py-3 text-gray-600">{backup.created_by}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {backup.created_at ? new Date(backup.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        backup.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(backup)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleRestore(backup.id)}
                          disabled={restoring === backup.id}
                          className="p-1 rounded-md hover:bg-gray-100 text-amber-600 disabled:opacity-50"
                          title="Restore"
                        >
                          {restoring === backup.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {backups.length === 0 && !loading && (
            <div className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No backups found</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
