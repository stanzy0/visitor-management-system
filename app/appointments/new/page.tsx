'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { createAdminNotification, createReceptionistNotification, createHostEmployeeNotification } from '@/lib/notifications'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { Loader2, ArrowLeft } from 'lucide-react'
import type { AppointmentFormData } from '@/lib/types/appointment'
import AppointmentForm from '@/components/appointments/AppointmentForm'
import Link from 'next/link'

export default function NewAppointmentPage() {
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('appointments')) {
        window.location.href = '/unauthorized'
        return
      }
      setUserRole(user.role)
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  const handleSubmit = async (formData: AppointmentFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create appointment')
      }

      const appointment = result.data
      logAuditAction('Appointment Created', 'appointment', appointment.id, `Appointment ${appointment.appointment_number} created`)
      createAdminNotification('Appointment Created', `Appointment scheduled for ${appointment.visitor?.full_name} with ${appointment.employee?.full_name}.`, 'appointment', 'appointment', appointment.id).catch(() => {})
      createReceptionistNotification('Appointment Created', `Appointment scheduled for ${appointment.visitor?.full_name} with ${appointment.employee?.full_name}.`, 'appointment', 'appointment', appointment.id).catch(() => {})
      createHostEmployeeNotification(appointment.employee_id, 'Appointment Created', `Appointment scheduled for ${appointment.visitor?.full_name}.`, 'appointment', 'appointment', appointment.id).catch(() => {})

      window.location.href = '/appointments'
    } catch (err) {
      console.error('Error creating appointment:', err)
      alert(err instanceof Error ? err.message : 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-dashboard-bg items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <Link href="/appointments" className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New Appointment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule a new visitor appointment</p>
        </div>

        <AppointmentForm onSubmit={handleSubmit} onCancel={() => (window.location.href = '/appointments')} loading={loading} />
      </div>
    </div>
  )
}
