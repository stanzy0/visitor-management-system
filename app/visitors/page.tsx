'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Loader2, Upload, X } from 'lucide-react'

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  company: string
  photo_url: string | null
  created_at: string
}

interface Employee {
  id: string
  full_name: string
}

interface VisitorFormData {
  full_name: string
  email: string
  phone: string
  company: string
  host_employee_id: string
  purpose: string
}

const initialFormData: VisitorFormData = {
  full_name: '',
  email: '',
  phone: '',
  company: '',
  host_employee_id: '',
  purpose: '',
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<VisitorFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      await Promise.all([fetchVisitors(), fetchEmployees()])
    }
    checkAuth()
  }, [])

  const fetchVisitors = async () => {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      showNotification('error', error.message)
    } else {
      setVisitors(data || [])
    }
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name')
      .order('full_name')
    if (!error) {
      setEmployees(data || [])
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const validatePhotoFile = (file: File): string | null => {
    if (!file) return null
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, JPEG, and PNG files are allowed'
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validatePhotoFile(file)
    if (error) {
      setPhotoError(error)
      return
    }

    setPhotoError(null)
    setPhotoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
  }

  const handlePhotoUpload = async (): Promise<string | null> => {
    if (!photoFile) return null

    setUploading(true)
    setUploadProgress(0)

    const sanitizedFileName = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-')
    const fileName = `${Date.now()}-${sanitizedFileName}`

    console.log('File name:', photoFile.name)
    console.log('File size:', photoFile.size)
    console.log('File type:', photoFile.type)
    console.log('Generated fileName:', fileName)

    try {
      const { data, error } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, photoFile)

      console.log('Upload Data:', data)
      console.log('Upload Error:', error)

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName)
      setUploadProgress(100)
      setPhotoPreview(null)
      setPhotoFile(null)
      return publicUrlData.publicUrl
    } catch (error: unknown) {
      const errorObj = error as { message?: string; statusCode?: number }
      console.error('Storage Upload Error:', error)
      console.error('Error Message:', errorObj.message)
      console.error('Status Code:', errorObj.statusCode)
      console.error('Full Error:', JSON.stringify(error, null, 2))
      setPhotoError(errorObj.message || 'Failed to upload photo')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    let photoUrl: string | null = null
    if (photoFile) {
      photoUrl = await handlePhotoUpload()
      if (photoFile && !photoUrl) {
        setSubmitting(false)
        return
      }
    }

    const { data: visitorData, error: visitorError } = await supabase
      .from('visitors')
      .insert([
        {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          photo_url: photoUrl || null,
        },
      ])
      .select()

if (visitorError) {
      showNotification('error', visitorError.message)
      setSubmitting(false)
      return
    }

    const hostEmployee = employees.find((e) => e.id === formData.host_employee_id)?.full_name || 'Unknown'
    if (photoUrl) {
      logAuditAction('Visitor Photo Uploaded', 'visitor', visitorData[0].id, `${formData.full_name}'s photo uploaded`)
    }

    const { error: visitError, data: visitData } = await supabase.from('visits').insert([
      {
        visitor_id: visitorData[0].id,
        employee_id: formData.host_employee_id,
        purpose: formData.purpose,
        status: 'pending',
      },
    ]).select()

    if (visitError) {
      showNotification('error', visitError.message)
    } else {
      logAuditAction('Visitor Registered', 'visitor', visitorData[0].id, `${formData.full_name} registered to meet ${hostEmployee} for ${formData.purpose}`)
      showNotification('success', 'Visitor registered successfully')
      setModalOpen(false)
      setFormData(initialFormData)
      setPhotoPreview(null)
      setPhotoFile(null)
      fetchVisitors()
    }
    setSubmitting(false)
  }

  const filteredVisitors = visitors.filter(
    (v) =>
      v.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.company.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Register Visitor
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Company</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {visitor.photo_url ? (
                          <img
                            src={visitor.photo_url}
                            alt={visitor.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">
                              {visitor.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                           <a href={`/visitors/${visitor.id}`} className="hover:text-blue-600 hover:underline">
                             {visitor.full_name}
                           </a>
                         </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{visitor.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {visitor.created_at ? new Date(visitor.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">Register Visitor</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photo (JPG/PNG, max 5MB)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Upload Photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {photoPreview && (
                      <div className="mt-3">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      </div>
                    )}
                    {uploading && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee</label>
                    <select
                      value={formData.host_employee_id}
                      onChange={(e) => setFormData({ ...formData, host_employee_id: e.target.value })}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                    Register
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
