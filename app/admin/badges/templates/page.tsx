'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import { Loader2, Plus, Edit, Trash2, X, Save, Shield } from 'lucide-react'
import type { BadgeTemplate } from '@/lib/badge/badge-types'

export default function AdminBadgeTemplatesPage() {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    badge_size: 'CR80',
    orientation: 'landscape',
    background_image: '',
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    text_color: '#111827',
    qr_position: 'right',
    photo_position: 'left',
    expiry_display: true,
    department_display: true,
    office_display: true,
    signature_area: false,
    layout: [] as unknown[],
    is_default: false,
  })

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/badges/templates', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch templates')
      }

      setTemplates(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load templates' })
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
      fetchTemplates()
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

      const url = '/api/admin/badges/templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const body = editingTemplate
        ? { id: editingTemplate.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save template')
      }

      setNotification({ type: 'success', message: editingTemplate ? 'Template updated successfully' : 'Template created successfully' })
      setModalOpen(false)
      setEditingTemplate(null)
      setFormData({
        name: '',
        description: '',
        badge_size: 'CR80',
        orientation: 'landscape',
        background_image: '',
        logo_url: '',
        primary_color: '#2563eb',
        secondary_color: '#1e40af',
        text_color: '#111827',
        qr_position: 'right',
        photo_position: 'left',
        expiry_display: true,
        department_display: true,
        office_display: true,
        signature_area: false,
        layout: [],
        is_default: false,
      })
      fetchTemplates()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save template' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: BadgeTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      badge_size: template.badge_size,
      orientation: template.orientation,
      background_image: template.background_image || '',
      logo_url: template.logo_url || '',
      primary_color: template.primary_color,
      secondary_color: template.secondary_color,
      text_color: template.text_color,
      qr_position: template.qr_position,
      photo_position: template.photo_position,
      expiry_display: template.expiry_display,
      department_display: template.department_display,
      office_display: template.office_display,
      signature_area: template.signature_area,
      layout: template.layout || [],
      is_default: template.is_default,
    })
    setModalOpen(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch(`/api/admin/badges/templates?id=${templateId}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to delete template')
      }

      setNotification({ type: 'success', message: 'Template deleted successfully' })
      fetchTemplates()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete template' })
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
            <h1 className="text-2xl font-bold text-gray-900">Badge Templates</h1>
            <p className="text-sm text-gray-500">Create and manage badge templates</p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null)
              setFormData({
                name: '',
                description: '',
                badge_size: 'CR80',
                orientation: 'landscape',
                background_image: '',
                logo_url: '',
                primary_color: '#2563eb',
                secondary_color: '#1e40af',
                text_color: '#111827',
                qr_position: 'right',
                photo_position: 'left',
                expiry_display: true,
                department_display: true,
                office_display: true,
                signature_area: false,
                layout: [],
                is_default: false,
              })
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500">{template.description || 'No description'}</p>
                </div>
                {template.is_default && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Default
                  </span>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Size:</span>
                  <span className="text-gray-900">{template.badge_size}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Orientation:</span>
                  <span className="text-gray-900 capitalize">{template.orientation}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">QR Position:</span>
                  <span className="text-gray-900 capitalize">{template.qr_position}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Photo Position:</span>
                  <span className="text-gray-900 capitalize">{template.photo_position}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                {!template.is_default && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 rounded-lg border border-gray-300 text-red-600 hover:bg-gray-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No templates found</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Size</label>
                    <select
                      value={formData.badge_size}
                      onChange={(e) => setFormData({ ...formData, badge_size: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    >
                      <option value="CR80">CR80</option>
                      <option value="A4">A4</option>
                      <option value="ID Card">ID Card</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">QR Position</label>
                    <select
                      value={formData.qr_position}
                      onChange={(e) => setFormData({ ...formData, qr_position: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.expiry_display}
                      onChange={(e) => setFormData({ ...formData, expiry_display: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Expiry Date</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.department_display}
                      onChange={(e) => setFormData({ ...formData, department_display: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Department</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.office_display}
                      onChange={(e) => setFormData({ ...formData, office_display: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Office Location</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.signature_area}
                      onChange={(e) => setFormData({ ...formData, signature_area: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Signature Area</span>
                  </label>
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
