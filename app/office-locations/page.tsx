'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { createAdminNotification } from '@/lib/notifications'

interface OfficeLocation {
  id: string
  name: string
  building: string | null
  department: string | null
  created_at: string
}

interface OfficeLocationFormData {
  name: string
  building: string
  department: string
}

const initialFormData: OfficeLocationFormData = {
  name: '',
  building: '',
  department: '',
}

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"

export default function OfficeLocationsPage() {
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null)
  const [formData, setFormData] = useState<OfficeLocationFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('settings')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchOfficeLocations()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchOfficeLocations = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('office_locations').select('*').order('created_at', { ascending: false })

    if (error) {
      showNotification('error', error.message)
    } else {
      setOfficeLocations(data || [])
    }
    setLoading(false)
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('office-locations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'office_locations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOfficeLocations(prev => [payload.new as OfficeLocation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOfficeLocations(prev => prev.map(l => l.id === (payload.new as OfficeLocation).id ? payload.new as OfficeLocation : l))
          } else if (payload.eventType === 'DELETE') {
            setOfficeLocations(prev => prev.filter(l => l.id !== (payload.old as OfficeLocation).id))
          }
        }
      )
      .subscribe()
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (editingLocation) {
      const { error } = await supabase
        .from('office_locations')
        .update({
          name: formData.name,
          building: formData.building || null,
          department: formData.department || null,
        })
        .eq('id', editingLocation.id)

      if (error) {
        showNotification('error', error.message)
        setSubmitting(false)
        return
      }
      
      setOfficeLocations(prev => prev.map(l => l.id === editingLocation.id ? { ...l, name: formData.name, building: formData.building || null, department: formData.department || null } : l))
      logAuditAction('Office Location Updated', 'office_location', editingLocation.id, `${formData.name} updated`)
      showNotification('success', 'Office location updated successfully')
      createAdminNotification('Office Location Updated', `Office location ${formData.name} has been updated.`, 'system', 'office_location', editingLocation.id).catch(() => {})
    } else {
      const { error, data: insertData } = await supabase.from('office_locations').insert([{
        name: formData.name,
        building: formData.building || null,
        department: formData.department || null,
      }]).select()

      if (error) {
        showNotification('error', error.message)
        setSubmitting(false)
        return
      }
      
      const newLocation = insertData?.[0]
      setOfficeLocations(prev => {
        const exists = prev.some(l => l.id === newLocation?.id)
        return exists ? prev : [...prev, newLocation as OfficeLocation]
      })
      logAuditAction('Office Location Created', 'office_location', insertData?.[0]?.id || null, `${formData.name} added`)
      showNotification('success', 'Office location added successfully')
      createAdminNotification('Office Location Added', `Office location ${formData.name} has been added.`, 'system', 'office_location', insertData?.[0]?.id).catch(() => {})
    }

    setSubmitting(false)
    setModalOpen(false)
    setEditingLocation(null)
    setFormData(initialFormData)
  }

  const handleEdit = (location: OfficeLocation) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      building: location.building || '',
      department: location.department || '',
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office location?')) return

    const locationToDelete = officeLocations.find((loc) => loc.id === id)
    setOfficeLocations(prev => prev.filter(l => l.id !== id))

    const { error } = await supabase.from('office_locations').delete().eq('id', id)

    if (error) {
      setOfficeLocations(prev => [...prev, locationToDelete!])
      showNotification('error', error.message)
    } else {
      logAuditAction('Office Location Deleted', 'office_location', id, `${locationToDelete?.name || id} deleted`)
      showNotification('success', 'Office location deleted successfully')
      createAdminNotification('Office Location Deleted', `Office location ${locationToDelete?.name || id} has been deleted.`, 'system', 'office_location', id).catch(() => {})
    }
  }

  const filteredLocations = officeLocations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.building || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openAddModal = () => {
    setEditingLocation(null)
    setFormData(initialFormData)
    setModalOpen(true)
  }

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
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Office Locations</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchInputClasses}
              />
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Office Location
            </button>
          </div>
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
                    <th className="px-4 py-3 font-semibold text-gray-700">Location Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Building</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{location.name}</td>
                      <td className="px-4 py-3 text-gray-600">{location.building || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{location.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {location.created_at ? new Date(location.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(location)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(location.id)}
                            className="p-1 rounded-md hover:bg-red-50 transition-colors"
                            aria-label="Delete"
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

            {!loading && filteredLocations.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-500">
                  {searchTerm ? 'No locations match your search' : 'No office locations found'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={openAddModal}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Office Location
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingLocation ? 'Edit Office Location' : 'Add Office Location'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Enter location name"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-1">
                      Building
                    </label>
                    <input
                      id="building"
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      placeholder="Enter building (optional)"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      id="department"
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Enter department (optional)"
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
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
                    {editingLocation ? 'Update' : 'Add'}
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