'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { Loader2, Plus, Edit, Trash2, X, Save, Shield } from 'lucide-react'

interface AdminRole {
  id: string
  name: string
  description?: string | null
  permissions: string[]
  is_system_role: boolean
  created_at: string
}

const ALL_PERMISSIONS = Array.from(new Set(Object.values(PERMISSIONS).flat())).sort()

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  })

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/roles', { headers })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch roles')
      }

      setRoles(result.data)
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load roles' })
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
      fetchRoles()
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

      const url = '/api/admin/roles'
      const method = editingRole ? 'PUT' : 'POST'

      const body = editingRole
        ? { id: editingRole.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save role')
      }

      setNotification({ type: 'success', message: editingRole ? 'Role updated successfully' : 'Role created successfully' })
      setModalOpen(false)
      setEditingRole(null)
      setFormData({ name: '', description: '', permissions: [] })
      fetchRoles()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save role' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (role: AdminRole) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    })
    setModalOpen(true)
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to delete role')
      }

      setNotification({ type: 'success', message: 'Role deleted successfully' })
      fetchRoles()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete role' })
    }
  }

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  return (
    <div className="min-h-screen bg-[#0B0F08]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Role Management</h1>
            <p className="text-sm text-[#9A9F87]">Create and manage custom roles with permissions</p>
          </div>
          <button
            onClick={() => {
              setEditingRole(null)
              setFormData({ name: '', description: '', permissions: [] })
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[rgba(85,107,47,0.35)] bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-[#9A9F87]">Role Name</th>
                  <th className="px-4 py-3 font-semibold text-[#9A9F87]">Description</th>
                  <th className="px-4 py-3 font-semibold text-[#9A9F87]">Permissions</th>
                  <th className="px-4 py-3 font-semibold text-[#9A9F87]">Type</th>
                  <th className="px-4 py-3 font-semibold text-[#9A9F87]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(85,107,47,0.25)]">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-[#4B5320]/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#F5F5DC]">{role.name}</td>
                    <td className="px-4 py-3 text-[#9A9F87]">{role.description || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <span key={permission} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${role.is_system_role ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-[#9A9F87]'}`}>
                        {role.is_system_role ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-[#9A9F87]" />
                        </button>
                        {!role.is_system_role && (
                          <button
                            onClick={() => handleDelete(role.id)}
                            className="p-1 rounded-md hover:bg-gray-100 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {roles.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[#9A9F87]">No roles found</p>
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
          <div className="w-full max-w-2xl rounded-xl bg-[#10150D] shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-[rgba(85,107,47,0.35)] p-4">
              <h2 className="text-lg font-semibold text-[#F5F5DC]">{editingRole ? 'Edit Role' : 'Create Role'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9A9F87] mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-[#10150D] px-3 py-2 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9A9F87] mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-[#10150D] px-3 py-2 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9A9F87] mb-2">Permissions *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label
                        key={permission}
                        className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                          formData.permissions.includes(permission)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-[#4B5320]/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-[#9A9F87] capitalize">{permission.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-[rgba(85,107,47,0.35)] p-4 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#9A9F87] hover:bg-[#4B5320]/10">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


