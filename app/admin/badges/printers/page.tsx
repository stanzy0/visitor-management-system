'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Loader2, Plus, Edit, Trash2, X, Save, Printer as PrinterIcon } from 'lucide-react'
import type { Printer } from '@/lib/badge/badge-types'

export default function AdminPrintersPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [printers, setPrinters] = useState<Printer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    printer_type: 'thermal',
    paper_size: 'CR80',
    orientation: 'landscape',
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    copies: 1,
    is_default: false,
  })

  const fetchPrinters = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/badges/printers', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch printers')
      }

      setPrinters(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load printers' })
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
      setUserRole(user.role)
      fetchPrinters()
    }
    checkAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const url = '/api/admin/badges/printers'
      const method = editingPrinter ? 'PUT' : 'POST'

      const body = editingPrinter
        ? { id: editingPrinter.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save printer')
      }

      setNotification({ type: 'success', message: editingPrinter ? 'Printer updated successfully' : 'Printer created successfully' })
      setModalOpen(false)
      setEditingPrinter(null)
      setFormData({
        name: '',
        printer_type: 'thermal',
        paper_size: 'CR80',
        orientation: 'landscape',
        margins: { top: 5, right: 5, bottom: 5, left: 5 },
        copies: 1,
        is_default: false,
      })
      fetchPrinters()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save printer' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer)
    setFormData({
      name: printer.name,
      printer_type: printer.printer_type,
      paper_size: printer.paper_size,
      orientation: printer.orientation,
      margins: printer.margins || { top: 5, right: 5, bottom: 5, left: 5 },
      copies: printer.copies,
      is_default: printer.is_default,
    })
    setModalOpen(true)
  }

  const handleDelete = async (printerId: string) => {
    if (!confirm('Are you sure you want to delete this printer? This action cannot be undone.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch(`/api/admin/badges/printers?id=${printerId}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to delete printer')
      }

      setNotification({ type: 'success', message: 'Printer deleted successfully' })
      fetchPrinters()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete printer' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/admin/badges" className="text-sm text-blue-600 hover:underline">
            ← Back to Badge Designer
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printer Management</h1>
            <p className="text-sm text-gray-500">Configure printers for badge printing</p>
          </div>
          <button
            onClick={() => {
              setEditingPrinter(null)
              setFormData({
                name: '',
                printer_type: 'thermal',
                paper_size: 'CR80',
                orientation: 'landscape',
                margins: { top: 5, right: 5, bottom: 5, left: 5 },
                copies: 1,
                is_default: false,
              })
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Printer
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
                  <th className="px-4 py-3 font-semibold text-gray-700">Printer Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Paper Size</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Orientation</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Copies</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Default</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {printers.map((printer) => (
                  <tr key={printer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{printer.name}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{printer.printer_type}</td>
                    <td className="px-4 py-3 text-gray-600">{printer.paper_size}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{printer.orientation}</td>
                    <td className="px-4 py-3 text-gray-600">{printer.copies}</td>
                    <td className="px-4 py-3">
                      {printer.is_default && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(printer)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(printer.id)}
                          className="p-1 rounded-md hover:bg-gray-100 text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {printers.length === 0 && !loading && (
            <div className="p-12 text-center">
              <PrinterIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No printers configured</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingPrinter ? 'Edit Printer' : 'Add Printer'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Printer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Printer Type</label>
                    <select
                      value={formData.printer_type}
                      onChange={(e) => setFormData({ ...formData, printer_type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    >
                      <option value="thermal">Thermal</option>
                      <option value="laser">Laser</option>
                      <option value="inkjet">Inkjet</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                    <select
                      value={formData.paper_size}
                      onChange={(e) => setFormData({ ...formData, paper_size: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    >
                      <option value="CR80">CR80</option>
                      <option value="A4">A4</option>
                      <option value="ID Card">ID Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
                    <select
                      value={formData.orientation}
                      onChange={(e) => setFormData({ ...formData, orientation: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.copies}
                    onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Set as default printer</span>
                </label>
              </div>
              <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingPrinter ? 'Update Printer' : 'Add Printer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
