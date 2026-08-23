'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { Loader2, RefreshCw, Play, CheckCircle, XCircle, Clock, Cog, AlertTriangle } from 'lucide-react'

interface BackgroundJob {
  id: string
  job_name: string
  job_type: string
  status: string
  last_run: string | null
  last_duration_ms: number | null
  next_run: string | null
  records_processed: number | null
  error_message: string | null
}

export default function BackgroundJobsPage() {
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system?section=jobs')
      const json = await res.json()
      if (json.success) {
        setJobs(json.data)
      }
    } catch (err) {
      console.error('Error fetching jobs:', err)
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
      fetchJobs()
    }
    checkAuth()
  }, [])

  const runJob = async (jobName: string) => {
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_job', job_name: jobName }),
      })
      fetchJobs()
    } catch (err) {
      console.error('Error running job:', err)
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
      <div className="min-h-screen bg-[#0B0F08] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    running: 'bg-green-100 text-green-800',
    idle: 'bg-gray-100 text-[#F5F5DC]',
    failed: 'bg-red-100 text-red-800',
    success: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="min-h-screen bg-[#0B0F08]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Background Jobs</h1>
            <p className="text-sm text-[#9A9F87]">Monitor and manage scheduled tasks</p>
          </div>
          <button onClick={fetchJobs} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#9A9F87] hover:bg-[#4B5320]/10">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Cog className="h-5 w-5 text-gray-400" />
                    <h3 className="text-sm font-semibold text-[#F5F5DC]">{job.job_name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-[#F5F5DC]'}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#9A9F87] mt-1">Type: {job.job_type}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-[#9A9F87]">Last Run</p>
                      <p className="text-sm font-medium text-[#F5F5DC]">{job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9A9F87]">Duration</p>
                      <p className="text-sm font-medium text-[#F5F5DC]">{job.last_duration_ms ? `${job.last_duration_ms}ms` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9A9F87]">Next Run</p>
                      <p className="text-sm font-medium text-[#F5F5DC]">{job.next_run ? new Date(job.next_run).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9A9F87]">Records Processed</p>
                      <p className="text-sm font-medium text-[#F5F5DC]">{job.records_processed || 0}</p>
                    </div>
                  </div>
                  {job.error_message && (
                    <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                      <p className="text-xs text-red-700">{job.error_message}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => runJob(job.job_name)}
                  className="ml-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Play className="h-3 w-3" />
                  Run Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


