'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { Loader2, RefreshCw, Download, Database, Table, Clock, Activity, HardDrive } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DatabaseHealth {
  tableSizes: Array<{ table_name: string; row_count: number; size_bytes: bigint }>
  slowestTables: Array<{ table_name: string; avg_query_time_ms: number }>
  lastBackup: string | null
  lastMigration: string | null
  activeConnections: number
}

export default function DatabaseHealthPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [data, setData] = useState<DatabaseHealth | null>(null)
  const [exporting, setExporting] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system?section=database')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err) {
      console.error('Error fetching database health:', err)
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
      setAuthChecking(false)
      fetchData()
    }
    checkAuth()
  }, [])

  const exportReport = () => {
    if (!data) return
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('Database Health Report', 14, 20)
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
      doc.text(`Last Backup: ${data.lastBackup || 'N/A'}`, 14, 34)
      doc.text(`Last Migration: ${data.lastMigration || 'N/A'}`, 14, 40)
      doc.text(`Active Connections: ${data.activeConnections}`, 14, 46)

      autoTable(doc, {
        startY: 54,
        head: [['Table', 'Rows', 'Size']],
        body: data.tableSizes.map(t => [t.table_name, t.row_count.toString(), formatBytes(Number(t.size_bytes))]),
      })

      doc.save(`database-health-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const formatBytes = (bytes: number) => {
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

  if (loading || !data) {
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
            <h1 className="text-2xl font-bold text-gray-900">Database Health</h1>
            <p className="text-sm text-gray-500">Monitor database performance and storage</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={exportReport} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Tables</p>
              <Table className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{data.tableSizes.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Rows</p>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{data.tableSizes.reduce((acc, t) => acc + t.row_count, 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Last Backup</p>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">{data.lastBackup ? new Date(data.lastBackup).toLocaleString() : 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Active Connections</p>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{data.activeConnections}</p>
          </div>
        </div>

        {/* Table Sizes Chart */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Table Sizes</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tableSizes.slice(0, 10).map(t => ({ ...t, size_mb: Number(t.size_bytes) / (1024 * 1024) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="table_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`${value.toFixed(2)} MB`, 'Size']} />
                <Bar dataKey="size_mb" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table Details */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Table Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Table</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Rows</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.tableSizes.map((table, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{table.table_name}</td>
                    <td className="px-4 py-3 text-gray-600">{table.row_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBytes(Number(table.size_bytes))}</td>
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
