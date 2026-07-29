'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Loader2, RefreshCw, Trash2, HardDrive, FileText, Image, Printer, FileSpreadsheet, Download } from 'lucide-react'

interface StorageBucket {
  id: string
  bucket_name: string
  file_count: number
  total_size_bytes: bigint
  largest_file_bytes: bigint | null
  oldest_file_at: string | null
  newest_file_at: string | null
}

const BUCKET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  visitor_photos: Image,
  visitor_documents: FileText,
  badge_pdfs: Printer,
  qr_codes: Download,
  reports: FileSpreadsheet,
}

export default function StorageMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [buckets, setBuckets] = useState<StorageBucket[]>([])
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
      fetchData()
    }
    checkAuth()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system?section=storage')
      const json = await res.json()
      if (json.success) {
        setBuckets(json.data)
      }
    } catch (err) {
      console.error('Error fetching storage data:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteOrphaned = async (bucketName: string) => {
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_orphaned_files', bucket_name: bucketName }),
      })
      fetchData()
    } catch (err) {
      console.error('Error deleting orphaned files:', err)
    }
  }

  const formatBytes = (bytes: bigint) => {
    const num = Number(bytes)
    if (num === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(num) / Math.log(k))
    return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
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

  const totalStorage = buckets.reduce((acc, b) => acc + Number(b.total_size_bytes), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Storage Monitor</h1>
            <p className="text-sm text-gray-500">Monitor file storage and cleanup orphaned files</p>
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Storage</p>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatBytes(BigInt(totalStorage))}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Files</p>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{buckets.reduce((acc, b) => acc + b.file_count, 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Buckets</p>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{buckets.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {buckets.map((bucket) => {
            const Icon = BUCKET_ICONS[bucket.bucket_name] || HardDrive
            return (
              <div key={bucket.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{bucket.bucket_name}</h3>
                      <p className="text-xs text-gray-500">{bucket.file_count} files</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOrphaned(bucket.bucket_name)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Orphaned
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500">Storage Used</p>
                    <p className="text-sm font-medium text-gray-900">{formatBytes(bucket.total_size_bytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Largest File</p>
                    <p className="text-sm font-medium text-gray-900">{bucket.largest_file_bytes ? formatBytes(bucket.largest_file_bytes) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Oldest File</p>
                    <p className="text-sm font-medium text-gray-900">{bucket.oldest_file_at ? new Date(bucket.oldest_file_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Newest File</p>
                    <p className="text-sm font-medium text-gray-900">{bucket.newest_file_at ? new Date(bucket.newest_file_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
