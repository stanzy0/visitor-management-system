'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-client'
import type { EmailTemplate } from '@/lib/types/admin'
import { Loader2, Plus, Edit, Trash2, X, Save, Mail, Search, RefreshCw, Eye, Send } from 'lucide-react'

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Invitation',
    subject: 'You are invited to visit {org}',
    body_html: '<p>Dear {name},</p><p>You are invited to visit {org}. Please arrive at the reception desk at {checkin_time}.</p>',
    body_text: 'Dear {name},\n\nYou are invited to visit {org}. Please arrive at the reception desk at {checkin_time}.',
    category: 'Invitation',
    is_active: true,
  },
  {
    name: 'Approval',
    subject: 'Your visit has been approved',
    body_html: '<p>Dear {name},</p><p>Your visit scheduled for {date} has been approved by {host_name}.</p>',
    body_text: 'Dear {name},\n\nYour visit scheduled for {date} has been approved by {host_name}.',
    category: 'Notification',
    is_active: true,
  },
  {
    name: 'Rejection',
    subject: 'Your visit has been rejected',
    body_html: '<p>Dear {name},</p><p>Unfortunately, your visit scheduled for {date} has been rejected. Please contact the host for more details.</p>',
    body_text: 'Dear {name},\n\nUnfortunately, your visit scheduled for {date} has been rejected. Please contact the host for more details.',
    category: 'Notification',
    is_active: true,
  },
  {
    name: 'Badge Ready',
    subject: 'Your badge is ready for pickup',
    body_html: '<p>Dear {name},</p><p>Your visitor badge is ready for pickup at the reception desk.</p>',
    body_text: 'Dear {name},\n\nYour visitor badge is ready for pickup at the reception desk.',
    category: 'Badge',
    is_active: true,
  },
  {
    name: 'Reminder',
    subject: 'Reminder: Your visit is scheduled',
    body_html: '<p>Dear {name},</p><p>This is a reminder that your visit is scheduled for {date} at {checkin_time}.</p>',
    body_text: 'Dear {name},\n\nThis is a reminder that your visit is scheduled for {date} at {checkin_time}.',
    category: 'Reminder',
    is_active: true,
  },
  {
    name: 'Appointment Update',
    subject: 'Your appointment has been updated',
    body_html: '<p>Dear {name},</p><p>Your appointment details have been updated. Please review the new information.</p>',
    body_text: 'Dear {name},\n\nYour appointment details have been updated. Please review the new information.',
    category: 'Notification',
    is_active: true,
  },
  {
    name: 'Visitor Checkout',
    subject: 'You have been checked out',
    body_html: '<p>Dear {name},</p><p>You have been checked out of the facility. Thank you for your visit.</p>',
    body_text: 'Dear {name},\n\nYou have been checked out of the facility. Thank you for your visit.',
    category: 'Notification',
    is_active: true,
  },
]


export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    category: '',
    body_html: '',
    body_text: '',
    is_active: true,
  })

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/email-templates', { headers })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to fetch templates')
      const data = result.data || []
      if (data.length === 0) {
        await seedDefaultTemplates()
      } else {
        setTemplates(data)
      }
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load email templates' })
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultTemplates = async () => {
    try {
      const headers = await getAuthHeaders()
      for (const template of DEFAULT_TEMPLATES) {
        const res = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers,
          body: JSON.stringify(template),
        })
        if (!res.ok) {
          const result = await res.json()
          console.error('Failed to seed template:', template.name, result.error)
        }
      }
      fetchTemplates()
    } catch (err) {
      console.error('Failed to seed default templates:', err)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      category: '',
      body_html: '',
      body_text: '',
      is_active: true,
    })
    setEditingTemplate(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const headers = await getAuthHeaders()
      const url = '/api/admin/email-templates'
      const method = editingTemplate ? 'PUT' : 'POST'
      const body = editingTemplate ? { id: editingTemplate.id, ...formData } : formData

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save template')

      setNotification({ type: 'success', message: editingTemplate ? 'Template updated successfully' : 'Template created successfully' })
      setModalOpen(false)
      resetForm()
      fetchTemplates()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save template' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      category: template.category,
      body_html: template.body_html,
      body_text: template.body_text,
      is_active: template.is_active,
    })
    setModalOpen(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/email-templates?id=${templateId}`, {
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

  const handleTestEmail = async (template: EmailTemplate) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: '',
          subject: template.subject,
          html: template.body_html,
          text: template.body_text,
          template_id: template.id,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send test email')
      setNotification({ type: 'success', message: 'Test email sent successfully' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send test email' })
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-sm text-gray-500">Manage email templates for visitor communications</p>
          </div>
          <button
            onClick={() => {
              resetForm()
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

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={fetchTemplates}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Template Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Subject</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Updated</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{template.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{template.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{template.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${template.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(template.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleTestEmail(template)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Test Email"
                        >
                          <Send className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
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

          {!loading && templates.length === 0 && (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No email templates found</p>
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
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body HTML</label>
                  <textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    rows={8}
                    placeholder="<p>Rich text HTML content...</p>"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
                  <textarea
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    rows={4}
                    placeholder="Plain text fallback..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Template Preview</h2>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm text-gray-900 font-medium">{previewTemplate.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">HTML Preview</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <iframe
                    srcDoc={previewTemplate.body_html}
                    title="Template Preview"
                    className="w-full h-96 border-0 bg-white rounded-md"
                    sandbox=""
                  />
                </div>
              </div>
              {previewTemplate.body_text && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Text Version</p>
                  <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                    {previewTemplate.body_text}
                  </pre>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button onClick={() => setPreviewTemplate(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
