'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { Loader2, Search, CheckCircle2, XCircle, Clock, LogOut } from 'lucide-react'
import type { Visit } from '@/lib/types/visit'

export default function ExitControlPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [processing, setProcessing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchVisits = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visits')
      .select('*, visitor:visitors(*), employee:employees(*), badge:visitor_badges(*), appointment:appointments(*)')
      .eq('status', 'checked_in')
      .order('check_in_time', { ascending: true })

    if (error) {
      console.error('Error fetching visits:', error)
    } else {
      setVisits(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('scanner')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchVisits()
    }
    checkAuth()
  }, [fetchVisits])

  useEffect(() => {
    const channel = supabase
      .channel('exit-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => fetchVisits())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchVisits])

  const handleApproveExit = async () => {
    if (!selectedVisit) return
    setProcessing(true)

    try {
      const now = new Date().toISOString()
      const { transitionVisitStatus } = await import('@/lib/server/lifecycle')
      await transitionVisitStatus(selectedVisit.id, 'checked_out', null, { method: 'security_exit' })

      await supabase.from('visits').update({ status: 'checked_out', check_out_time: now }).eq('id', selectedVisit.id)

      await fetch('/api/security/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: selectedVisit.visitor_id,
          visit_id: selectedVisit.id,
          badge_id: selectedVisit.badge?.id,
          verification_method: 'badge',
          decision: 'approved',
          activity_type: 'exit_attempt',
          direction: 'out',
        }),
      })

      if (selectedVisit.badge?.id) {
        try {
          await supabase.from('visitor_badges').update({ badge_status: 'Checked Out' }).eq('id', selectedVisit.badge.id)
        } catch (err) {
          console.error('Badge deactivation failed:', err)
        }
      }

      if (selectedVisit.appointment_id) {
        try {
          await supabase.from('appointments').update({ status: 'Completed' }).eq('id', selectedVisit.appointment_id)
        } catch (err) {
          console.error('Failed to close appointment:', err)
        }
      }

      setNotification({ type: 'success', message: 'Exit approved and visit closed successfully' })
      setSelectedVisit(null)
      fetchVisits()
    } catch (err) {
      console.error('Exit error:', err)
      setNotification({ type: 'error', message: 'Exit processing failed' })
    } finally {
      setProcessing(false)
    }
  }

  const handleHold = async () => {
    if (!selectedVisit) return
    setProcessing(true)

    try {
      await fetch('/api/security/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: selectedVisit.visitor_id,
          visit_id: selectedVisit.id,
          badge_id: selectedVisit.badge?.id,
          verification_method: 'badge',
          decision: 'hold',
          activity_type: 'exit_attempt',
          direction: 'out',
        }),
      })

      setSelectedVisit(null)
      fetchVisits()
    } catch (err) {
      console.error('Hold error:', err)
    } finally {
      setProcessing(false)
    }
  }

  if (authChecking || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const filteredVisits = visits.filter((v) =>
    v.visitor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.badge?.badge_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exit Control</h1>
          <p className="text-sm text-gray-500">Manage visitor exits and badge cancellation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Visitor / Badge</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Visitors Inside</h3>
              <div className="space-y-2">
                {filteredVisits.map((visit) => (
                  <button
                    key={visit.id}
                    onClick={() => setSelectedVisit(visit)}
                    className={`w-full text-left rounded-lg border p-3 text-sm hover:bg-gray-50 ${
                      selectedVisit?.id === visit.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</p>
                    <p className="text-xs text-gray-500">Badge: {visit.badge?.badge_number || '—'}</p>
                    <p className="text-xs text-gray-500">Host: {visit.employee?.full_name || '—'}</p>
                  </button>
                ))}
                {filteredVisits.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No visitors currently inside</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedVisit ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
                <div className="flex flex-col items-center">
                  {selectedVisit.visitor?.photo_url ? (
                    <img src={selectedVisit.visitor.photo_url} alt={selectedVisit.visitor?.full_name || ''} className="h-40 w-40 rounded-full object-cover mb-4" />
                  ) : (
                    <div className="h-40 w-40 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                      <span className="text-4xl text-gray-500">{(selectedVisit.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{selectedVisit.visitor?.full_name || '—'}</h2>
                  <p className="text-gray-600">{selectedVisit.visitor?.visitor_organization || '—'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Host Employee</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVisit.employee?.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Badge Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVisit.badge?.badge_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Check-In Time</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVisit.check_in_time ? new Date(selectedVisit.check_in_time).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Badge Status</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVisit.badge?.badge_status || '—'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={handleApproveExit} disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[52px]">
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Exit
                  </button>
                  <button onClick={handleHold} disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 min-h-[52px]">
                    <Clock className="h-4 w-4" />
                    Hold
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-12 text-center">
                <LogOut className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a visitor to process exit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
