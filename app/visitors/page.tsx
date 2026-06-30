'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Loader2, Upload, X, Camera, RefreshCw, Trash2 } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string
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
  visitor_organization: string
  host_employee_id: string
  purpose: string
  has_vehicle: boolean
  registration_number: string
  vehicle_type: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  driver_name: string
  driver_phone: string
  parking_slot: string
  notes: string
}

const initialFormData: VisitorFormData = {
  full_name: '',
  email: '',
  phone: '',
  visitor_organization: '',
  host_employee_id: '',
  purpose: '',
  has_vehicle: false,
  registration_number: '',
  vehicle_type: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_color: '',
  driver_name: '',
  driver_phone: '',
  parking_slot: '',
  notes: '',
}

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
const selectClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"

const PURPOSE_OPTIONS = [
  'Official Meeting',
  'Training',
  'Conference',
  'Course',
  'Seminar',
  'Administrative Matter',
  'Delivery',
  'Maintenance',
  'Contractor Visit',
  'Official Assignment',
  'Personal Visit',
  'Other',
]

const VEHICLE_TYPE_OPTIONS = [
  'Car',
  'SUV',
  'Truck',
  'Bus',
  'Motorcycle',
  'Military Vehicle',
  'Other',
]

const VEHICLE_MODEL_OPTIONS = [
  'Corolla',
  'Camry',
  'Highlander',
  'RAV4',
  'Tacoma',
  'Tundra',
  'Land Cruiser',
  'Hilux',
  'Yaris',
  'Avalon',
  'Sienna',
  '4Runner',
  'Crown',
  'bZ4X',
  'Other',
]

const VEHICLE_MAKE_OPTIONS = [
  'Toyota',
  'Nissan',
  'Ford',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Volkswagen',
  'Hyundai',
  'Kia',
  'Lexus',
  'Mazda',
  'Honda',
  'Chevrolet',
  'Jeep',
  'Land Rover',
  'Other',
]

const VEHICLE_COLOR_OPTIONS = [
  'Black',
  'White',
  'Silver',
  'Gray',
  'Red',
  'Blue',
  'Green',
  'Brown',
  'Gold',
  'Orange',
  'Purple',
  'Yellow',
  'Other',
]

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
  const [cameraActive, setCameraActive] = useState(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('visitors')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchVisitors()
      fetchEmployees()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  useEffect(() => {
    if (cameraActive) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [cameraActive, currentCameraIndex])

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('visitors-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVisitors(prev => [payload.new as Visitor, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setVisitors(prev => prev.map(v => v.id === (payload.new as Visitor).id ? payload.new as Visitor : v))
          } else if (payload.eventType === 'DELETE') {
            setVisitors(prev => prev.filter(v => v.id !== (payload.old as Visitor).id))
          }
        }
      )
      .subscribe()
  }

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      setCameras(videoDevices)
      return videoDevices
    } catch {
      return []
    }
  }

  const startCamera = async () => {
    setCameraPermissionError(null)
    try {
      const devices = await getCameraDevices()
      const deviceId = devices[currentCameraIndex]?.deviceId
      
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      const errorObj = err as Error
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setCameraPermissionError('Camera permission denied. Please allow camera access.')
      } else if (errorObj.name === 'NotFoundError') {
        setCameraPermissionError('No camera available.')
      } else {
        setCameraPermissionError('Failed to start camera: ' + errorObj.message)
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const switchCamera = () => {
    if (cameras.length > 1) {
      stopCamera()
      setCurrentCameraIndex((prev) => (prev + 1) % cameras.length)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(blob))
        stopCamera()
        setCameraActive(false)
      }
    }, 'image/jpeg', 0.9)
  }

  const retakePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setCameraActive(true)
  }

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

    setDeletingId(id)
    const { error } = await supabase.from('visitors').delete().eq('id', id)

    if (error) {
      showNotification('error', error.message)
    } else {
      logAuditAction('Visitor Deleted', 'visitor', id, `Visitor ${name} deleted`)
      showNotification('success', 'Visitor deleted successfully')
      setVisitors(prev => prev.filter(v => v.id !== id))
    }
    setDeletingId(null)
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

    try {
      const { data, error } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, photoFile)

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName)
      setUploadProgress(100)
      return publicUrlData.publicUrl
    } catch (error: unknown) {
      const errorObj = error as { message?: string; statusCode?: number }
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
    let photoSourceType: 'upload' | 'camera' = 'upload'
    if (photoFile) {
      photoSourceType = photoFile.name.startsWith('camera-photo') ? 'camera' : 'upload'
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
          visitor_organization: formData.visitor_organization,
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
      if (photoSourceType === 'camera') {
        logAuditAction('Visitor Photo Captured', 'visitor', visitorData[0].id, 'Visitor photo captured using device camera')
      } else {
        logAuditAction('Visitor Photo Uploaded', 'visitor', visitorData[0].id, `${formData.full_name}'s photo uploaded`)
      }
    }

    const { error: visitError } = await supabase.from('visits').insert([
      {
        visitor_id: visitorData[0].id,
        employee_id: formData.host_employee_id,
        purpose: formData.purpose,
        status: 'pending',
      },
    ])

    if (visitError) {
      showNotification('error', visitError.message)
    } else {
      if (formData.has_vehicle && formData.registration_number) {
        await supabase.from('vehicles').insert([
          {
            visitor_id: visitorData[0].id,
            registration_number: formData.registration_number,
            vehicle_type: formData.vehicle_type,
            vehicle_make: formData.vehicle_make || null,
            vehicle_model: formData.vehicle_model || null,
            vehicle_color: formData.vehicle_color || null,
            driver_name: formData.driver_name || null,
            driver_phone: formData.driver_phone || null,
            parking_slot: formData.parking_slot || null,
            notes: formData.notes || null,
          },
        ])
      }

      logAuditAction('Visitor Registered', 'visitor', visitorData[0].id, `${formData.full_name} registered to meet ${hostEmployee} for ${formData.purpose}`)
      showNotification('success', 'Visitor registered successfully')
      setModalOpen(false)
      setFormData(initialFormData)
      setPhotoPreview(null)
      setPhotoFile(null)
      setCameraActive(false)
    }
    setSubmitting(false)
  }

  const filteredVisitors = visitors.filter(
    (v) =>
      v.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.visitor_organization.toLowerCase().includes(searchTerm.toLowerCase()),
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
                className={searchInputClasses}
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
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor Organization</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 w-24">Actions</th>
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
                    <td className="px-4 py-3 text-gray-600">{visitor.visitor_organization || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {visitor.created_at ? new Date(visitor.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`/visitors/${visitor.id}`} className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="View">
                          <Search className="h-4 w-4 text-gray-600" />
                        </a>
                        <button
                          onClick={() => handleDelete(visitor.id, visitor.full_name)}
                          disabled={deletingId === visitor.id}
                          className="p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          {deletingId === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                        </button>
                      </div>
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
                      placeholder="Enter full name"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="Enter email"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Organization</label>
                    <input
                      type="text"
                      value={formData.visitor_organization}
                      onChange={(e) => setFormData({ ...formData, visitor_organization: e.target.value })}
                      placeholder="Enter organization"
                      className={inputClasses}
                    />
                  </div>
                  
                  {/* Photo Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visitor Photo
                    </label>
                    <div className="flex flex-col gap-3">
                      {cameraActive ? (
                        <div className="space-y-3">
                          {cameraPermissionError ? (
                            <div className="p-4 text-center">
                              <p className="text-red-600 text-sm">{cameraPermissionError}</p>
                            </div>
                          ) : (
                            <>
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg bg-black object-cover"
                                style={{ aspectRatio: '4/3' }}
                              />
                              <canvas ref={canvasRef} className="hidden" />
                              
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-center gap-2">
                                  {cameras.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={switchCamera}
                                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      Switch Camera
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                  >
                                    <Camera className="h-3 w-3" />
                                    Capture
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {photoPreview ? (
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No photo</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {!cameraActive && (
                          <button
                            type="button"
                            onClick={() => setCameraActive(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Camera className="h-4 w-4" />
                            Take Photo
                          </button>
                        )}
                        {!cameraActive && photoPreview && (
                          <button
                            type="button"
                            onClick={retakePhoto}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Retake
                          </button>
                        )}
                        {!cameraActive && (
                          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Upload Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    
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
                      className={selectClasses}
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
                     <select
                       value={formData.purpose}
                       onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                       required
                       className={selectClasses}
                     >
                       <option value="">Select purpose</option>
                       {PURPOSE_OPTIONS.map((option) => (
                         <option key={option} value={option}>
                           {option}
                         </option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle?</label>
                     <select
                       value={formData.has_vehicle ? 'Yes' : 'No'}
                       onChange={(e) => setFormData({ ...formData, has_vehicle: e.target.value === 'Yes' })}
                       className={selectClasses}
                     >
                       <option value="No">No</option>
                       <option value="Yes">Yes</option>
                     </select>
                   </div>

                   {formData.has_vehicle && (
                     <div className="space-y-4 border-t border-gray-200 pt-4">
                       <p className="text-sm font-medium text-gray-700">Vehicle Details</p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                           <input
                             type="text"
                             value={formData.registration_number}
                             onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                             placeholder="Enter registration number"
                             className={inputClasses}
                           />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                           <select
                             value={formData.vehicle_type}
                             onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                             className={selectClasses}
                             required={formData.has_vehicle}
                           >
                             <option value="">Select type</option>
                             {VEHICLE_TYPE_OPTIONS.map((type) => (
                               <option key={type} value={type}>{type}</option>
                             ))}
                           </select>
                         </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Make</label>
                            <select
                              value={formData.vehicle_make}
                              onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                              className={selectClasses}
                            >
                              <option value="">Select make</option>
                              {VEHICLE_MAKE_OPTIONS.map((make) => (
                                <option key={make} value={make}>{make}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                            <select
                              value={formData.vehicle_model}
                              onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                              className={selectClasses}
                            >
                              <option value="">Select model</option>
                              {VEHICLE_MODEL_OPTIONS.map((model) => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Color</label>
                            <select
                              value={formData.vehicle_color}
                              onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                              className={selectClasses}
                            >
                              <option value="">Select color</option>
                              {VEHICLE_COLOR_OPTIONS.map((color) => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                           <input
                             type="text"
                             value={formData.driver_name}
                             onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                             placeholder="Enter driver name"
                             className={inputClasses}
                           />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone</label>
                           <input
                             type="tel"
                             value={formData.driver_phone}
                             onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                             placeholder="Enter driver phone"
                             className={inputClasses}
                           />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Parking Slot</label>
                           <input
                             type="text"
                             value={formData.parking_slot}
                             onChange={(e) => setFormData({ ...formData, parking_slot: e.target.value })}
                             placeholder="e.g. A-12"
                             className={inputClasses}
                           />
                         </div>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                         <textarea
                           value={formData.notes}
                           onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                           placeholder="Additional notes"
                           rows={2}
                           className={inputClasses}
                         />
                       </div>
                     </div>
                   )}
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