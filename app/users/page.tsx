'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserWithRole, UserRole } from '@/lib/auth'
import { logAuditAction } from '@/lib/client/audit'
import { Search, Plus, Edit, Trash2, X, Loader2, Users } from 'lucide-react'

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function UsersPage() {
  const [users, setUsers] = useState<Array<UserWithRole & { user_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<(UserWithRole & { user_id: string }) | null>(null)
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'Receptionist' as UserRole })
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [tempPasswordEmail, setTempPasswordEmail] = useState<string | null>(null)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  function setupRealtime() {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers(prev => [payload.new as UserWithRole & { user_id: string }, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setUsers(prev => prev.map(u => u.user_id === (payload.new as UserWithRole & { user_id: string }).user_id ? payload.new as UserWithRole & { user_id: string } : u))
          } else if (payload.eventType === 'DELETE') {
            setUsers(prev => prev.filter(u => u.user_id !== (payload.old as UserWithRole & { user_id: string }).user_id))
          }
        }
      )
      .subscribe()
  }

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('[FETCH USERS] Result:', { count: data?.length || 0, error: error?.message })

    if (error) {
      showNotification('error', error.message)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingUser) {
        const res = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUser.user_id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showNotification('error', data.error || 'Failed to update user')
        } else {
          logAuditAction('Role Changed', 'user', editingUser.user_id, `${formData.email} assigned ${formData.role} role`)
          showNotification('success', 'User updated successfully')
          setModalOpen(false)
          setEditingUser(null)
          setFormData({ email: '', full_name: '', role: 'Receptionist' })
          fetchUsers()
        }
      } else {
        const res = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showNotification('error', data.error || 'Failed to create user')
        } else {
          logAuditAction('Role Assigned', 'user', data.user?.user_id || null, `${formData.email} assigned ${formData.role} role`)
          showNotification('success', `User added successfully`)
          setTempPassword(data.tempPassword)
          setTempPasswordEmail(formData.email)
          setResetPasswordUserId(data.user?.user_id)
          setModalOpen(false)
          setEditingUser(null)
          setFormData({ email: '', full_name: '', role: 'Receptionist' })
          fetchUsers()
        }
      }
    } catch {
      showNotification('error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(user: UserWithRole & { user_id: string }) {
    setEditingUser(user)
    setFormData({ email: user.email, full_name: user.full_name || '', role: user.role })
    setModalOpen(true)
  }

  async function handleDelete(userId: string) {
    if (!confirm('Are you sure you want to remove this user assignment?')) return

    const userToDelete = users.find((u) => u.user_id === userId)
    console.log('[DELETE UI] Attempting to delete user:', { userId, email: userToDelete?.email, currentUsersCount: users.length })

    try {
      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()
      console.log('[DELETE UI] Delete response:', { status: res.status, data })

      if (!res.ok) {
        showNotification('error', data.error || 'Failed to delete user')
      } else {
        logAuditAction('Role Removed', 'user', userId, `Role removed for ${userToDelete?.email}`)
        showNotification('success', 'User role removed successfully')
      }

      fetchUsers().then(() => {
        console.log('[DELETE UI] After fetchUsers, users count:', users.length)
      })
    } catch {
      showNotification('error', 'An unexpected error occurred. Please try again.')
    }
  }

  async function fetchEmailStatus() {
    try {
      const res = await fetch('/api/admin/email-status')
      const data = await res.json()
      if (data.configured) {
        setTempPassword(data.temporaryPassword || null)
        setResetPasswordUserId(data.userId || null)
      }
    } catch {
      console.error('Failed to fetch email status')
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user || user.role !== 'Admin') {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      setUserRole(user.role)
      fetchUsers()
      setupRealtime()
      fetchEmailStatus()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </a>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">User Management</h1>
          </div>
          <button
            onClick={() => {
              setEditingUser(null)
              setFormData({ email: '', full_name: '', role: 'Receptionist' })
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={searchInputClasses}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Security">Security</option>
            <option value="Host Employee">Host Employee</option>
          </select>
        </div>

        {notification && (
          <div
            className={`rounded-lg p-4 text-sm ${
              notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {notification.message}
          </div>
        )}

        {tempPassword && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <h3 className="text-sm font-semibold text-yellow-800">Temporary Credentials</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Email: <span className="font-mono">{tempPasswordEmail}</span>
            </p>
            <p className="mt-1 text-sm text-yellow-700">
              Temporary Password: <span className="font-mono font-bold">{tempPassword}</span>
            </p>
            <p className="mt-2 text-xs text-yellow-600">
              Share this password securely with the user. They must change it on first login.
            </p>
            <button
              onClick={() => { setTempPassword(null); setTempPasswordEmail(null); setResetPasswordUserId(null) }}
              className="mt-3 rounded-lg bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.full_name || (
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>No name set</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            aria-label="Edit user"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.user_id)}
                            className="p-1 rounded-md hover:bg-red-50 transition-colors"
                            aria-label="Delete user"
                          >
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
          {!loading && filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="Enter email"
                      disabled={!!editingUser}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter full name (optional)"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className={selectClasses}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Security">Security</option>
                      <option value="Host Employee">Host Employee</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingUser ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
