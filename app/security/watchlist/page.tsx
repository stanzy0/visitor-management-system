'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { Loader2, Plus, Search, Trash2, Edit, X, ShieldAlert, AlertTriangle } from 'lucide-react'
import type { WatchlistEntry, WatchlistSeverity } from '@/lib/types/security'

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WatchlistEntry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    reason: '',
    severity: 'Medium' as WatchlistSeverity,
    document_number: '',
    phone: '',
    email: '',
    is_active: true,
  })

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security/watchlist')
      const json = await res.json()
      if (json.success) {
        setEntries(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
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
      if (!PERMISSIONS[user.role]?.includes('watchlist')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchEntries()
    }
    checkAuth()
  }, [fetchEntries])

  useEffect(() => {
    const channel = supabase
      .channel('watchlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => fetchEntries())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEntries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingEntry ? '/api/security/watchlist' : '/api/security/watchlist'
      const method = editingEntry ? 'PUT' : 'POST'

      const body = editingEntry ? { id: editingEntry.id, ...form } : form

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (json.success) {
        setNotification({ type: 'success', message: editingEntry ? 'Watchlist entry updated' : 'Watchlist entry created' })
        setModalOpen(false)
        setEditingEntry(null)
        setForm({ full_name: '', reason: '', severity: 'Medium', document_number: '', phone: '', email: '', is_active: true })
        fetchEntries()
      } else {
        setNotification({ type: 'error', message: json.error || 'Operation failed' })
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'An unexpected error occurred' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this watchlist entry?')) return

    try {
      const res = await fetch(`/api/security/watchlist?id=${id}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        setNotification({ type: 'success', message: 'Watchlist entry deleted' })
        fetchEntries()
      } else {
        setNotification({ type: 'error', message: json.error || 'Delete failed' })
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Delete failed' })
    }
  }

  const openEdit = (entry: WatchlistEntry) => {
    setEditingEntry(entry)
    setForm({
      full_name: entry.full_name,
      reason: entry.reason,
      severity: entry.severity,
      document_number: entry.document_number || '',
      phone: entry.phone || '',
      email: entry.email || '',
      is_active: entry.is_active,
    })
    setModalOpen(true)
  }

  const severityColors: Record<WatchlistSeverity, string> = {
    Low: 'bg-gray-100 text-gray-800',
    Medium: 'bg-blue-100 text-blue-800',
    High: 'bg-amber-100 text-amber-800',
    Critical: 'bg-red-100 text-red-800',
  }

  if (authChecking || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const filteredEntries = entries.filter((e) =>
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Watchlist Management</h1>
            <p className="text-sm text-gray-500">Admin-only watchlist for security screening</p>
          </div>
          <button onClick={() => { setEditingEntry(null); setForm({ full_name: '', reason: '', severity: 'Medium', document_number: '', phone: '', email: '', is_active: true }); setModalOpen(true) }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 min-h-[52px]">
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or document number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Severity</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Document Number</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[entry.severity]}`}>
                        {entry.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entry.document_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${entry.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(entry)} className="p-1 rounded-md hover:bg-gray-100">
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} className="p-1 rounded-md hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingEntry ? 'Edit Watchlist Entry' : 'Add Watchlist Entry'}</h2>
              <button onClick={() => { setModalOpen(false); setEditingEntry(null) }} className="p-2 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} required rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select value={form.severity} onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as WatchlistSeverity }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                <input type="text" value={form.document_number} onChange={(e) => setForm((prev) => ({ ...prev, document_number: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); setEditingEntry(null) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingEntry ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
