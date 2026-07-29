'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import {
  Loader2, RefreshCw, Download, Trash2, Plus, Database, HardDrive,
  FileText, Shield, Clock, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Backup {
  id: string
  backup_type: string
  backup_size_bytes: number | null
  tables: string[] | null
  storage_size_bytes: number | null
  status: string
  checksum: string | null
  created_at: string
  completed_at: string | null
}

const BACKUP_TYPES = [
  { label: 'Full Backup', value: 'full', description: 'Complete system backup including database and storage' },
  { label: 'Database Only', value: 'database', description: 'Database schema and data only' },
  { label: 'Storage Only', value: 'storage', description: 'Files and documents only' },
  { label: 'Configuration Only', value: 'configuration', description: 'Settings and configuration only' },
]

export default function BackupsPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [backups, setBackups] = useState<Backup[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState('full')
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
      fetchBackups()
    }
    checkAuth()
  }, [])

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deployment?section=backups')
      const json = await res.json()
      if (json.success) {
        setBackups(json.data)
      }
    } catch (err) {
      console.error('Error fetching backups:', err)
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    setCreating(true)
    try {
      await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_backup', backup_type: selectedType }),
      })
      fetchBackups()
    } catch (err) {
      console.error('Error creating backup:', err)
    } finally {
      setCreating(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return
    try {
      await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_backup', backup_id: backupId }),
      })
      fetchBackups()
    } catch (err) {
      console.error('Error deleting backup:', err)
    }
  }

  const exportBackupList = () => {
    setLoading(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('Backup History Report', 14, 20)
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

      autoTable(doc, {
        startY: 36,
        head: [['ID', 'Type', 'Size', 'Status', 'Date']],
        body: backups.map(b => [
          b.id.slice(0, 8),
          b.backup_type,
          b.backup_size_bytes ? `${(b.backup_size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
          b.status,
          new Date(b.created_at).toLocaleString(),
        ]),
      })

      doc.save(`backups-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
            <p className="text-sm text-gray-500">Manage system backups</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportBackupList} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button onClick={fetchBackups} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Create Backup */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Backup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {BACKUP_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${selectedType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <h3 className="text-sm font-semibold text-gray-900">{type.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
          <button
            onClick={createBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>

        {/* Backup History */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Backup History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Size</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No backups found</td></tr>
                )}
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">{backup.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{backup.backup_type}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBytes(backup.backup_size_bytes)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${backup.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {backup.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(backup.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteBackup(backup.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
