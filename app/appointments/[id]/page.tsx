'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Loader2, ArrowLeft, LogIn, LogOut, Check, X } from 'lucide-react'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'

interface Appointment {
  id: string
  visitor_id: string
  employee_id: string
  appointment_date: string
  expected_arrival: string | null
  expected_departure: string | null
  purpose: string
  notes: string | null
  qr_code: string | null
  status: string
  visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null } | null
  employee: { full_name: string; department: string; office_location: string } | null
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setAppointmentId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!appointmentId) return
    const fetchData = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          visitor:visitors(full_name, visitor_organization, photo_url),
          employee:employees(full_name, department, office_location)
        `)
        .eq('id', appointmentId)
        .single()

      if (error) {
        console.error('Error fetching appointment:', error)
      } else {
        setAppointment(data as Appointment)
      }
      setLoading(false)
    }
    fetchData()
  }, [appointmentId])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <a href="/appointments" className="text-sm text-blue-600 hover:underline">
              ← Back to Appointments
            </a>
          </div>
          <p className="text-gray-500">Appointment not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/appointments" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex flex-col items-center">
                {appointment.visitor?.photo_url ? (
                  <img
                    src={appointment.visitor.photo_url}
                    alt={appointment.visitor?.full_name || ''}
                    className="h-32 w-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <span className="text-3xl text-gray-500">
                      {(appointment.visitor?.full_name || '').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">{appointment.visitor?.full_name || '—'}</h2>
                <p className="text-gray-600">{appointment.visitor?.visitor_organization || '—'}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Host Employee</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Department</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.department || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Office Location</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.employee?.office_location || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Appointment Date</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.appointment_date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Expected Arrival</p>
                  <p className="text-sm font-medium text-gray-900">{appointment.expected_arrival || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Purpose</p>
                  <p className="text-sm text-gray-900">{appointment.purpose || '—'}</p>
                </div>
                {appointment.notes && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Notes</p>
                    <p className="text-sm text-gray-900">{appointment.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium`}>
                    {appointment.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {appointment.status === 'Approved' && (
                  <button
                    onClick={() => {}}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4" />
                    Check In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}