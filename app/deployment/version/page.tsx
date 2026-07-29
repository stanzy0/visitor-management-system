'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Loader2, RefreshCw, GitBranch, Package, FileText, Clock, Server,
  CheckCircle, AlertTriangle, Database, Globe,
} from 'lucide-react'

interface Deployment {
  id: string
  version: string
  commit_hash: string | null
  build_number: string | null
  environment: string
  status: string
  rolled_back: boolean
  deployed_at: string
}

export default function VersionManagementPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [deployments, setDeployments] = useState<Deployment[]>([])
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
      fetchDeployments()
    }
    checkAuth()
  }, [])

  const fetchDeployments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deployment?section=deployments')
      const json = await res.json()
      if (json.success) {
        setDeployments(json.data)
      }
    } catch (err) {
      console.error('Error fetching deployments:', err)
    } finally {
      setLoading(false)
    }
  }

  const rollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return
    try {
      await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', deployment_id: deploymentId }),
      })
      fetchDeployments()
    } catch (err) {
      console.error('Error rolling back:', err)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const latestDeployment = deployments[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Version Management</h1>
            <p className="text-sm text-gray-500">Track and manage application versions</p>
          </div>
          <button onClick={fetchDeployments} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Current Version */}
        {latestDeployment && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Deployment</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-sm font-semibold text-gray-900">{latestDeployment.version}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Commit</p>
                <p className="text-sm font-mono text-gray-900">{latestDeployment.commit_hash ? latestDeployment.commit_hash.slice(0, 8) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Build Number</p>
                <p className="text-sm font-semibold text-gray-900">{latestDeployment.build_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Environment</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{latestDeployment.environment}</p>
              </div>
            </div>
          </div>
        )}

        {/* Version Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <VersionInfoCard label="Application Version" value="1.0.0" icon={Package} />
          <VersionInfoCard label="Build Date" value={new Date().toLocaleDateString()} icon={Clock} />
          <VersionInfoCard label="Node Version" value={process.version} icon={Server} />
          <VersionInfoCard label="Next.js Version" value="16.2.9" icon={Globe} />
        </div>

        {/* Deployment History */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Deployment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Version</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Commit</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Build</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Environment</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deployments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No deployments found</td></tr>
                )}
                {deployments.map((deployment) => (
                  <tr key={deployment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{deployment.version}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{deployment.commit_hash ? deployment.commit_hash.slice(0, 8) : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{deployment.build_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{deployment.environment}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(deployment.deployed_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${deployment.rolled_back ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {deployment.rolled_back ? 'Rolled Back' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!deployment.rolled_back && (
                        <button
                          onClick={() => rollback(deployment.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Rollback
                        </button>
                      )}
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

function VersionInfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
