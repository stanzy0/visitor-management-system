import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Appointment, AppointmentFormData, AppointmentStats } from '@/lib/types/appointment'

export async function generateAppointmentNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `APT-${year}${month}-${random}`
}

export async function createAppointment(data: AppointmentFormData, createdBy: string): Promise<Appointment> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const appointmentNumber = await generateAppointmentNumber()

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      appointment_number: appointmentNumber,
      visitor_id: data.visitor_id,
      employee_id: data.employee_id,
      office_location: data.office_location,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      expected_duration: data.expected_duration,
      purpose: data.purpose,
      status: 'Scheduled',
      notes: data.notes || null,
      created_by: createdBy,
    })
    .select('*, visitor:visitors(*), employee:employees(*)')
    .single()

  if (error || !appointment) {
    throw new Error(error?.message || 'Failed to create appointment')
  }

  return appointment as Appointment
}

export async function getAppointments(startDate?: string, endDate?: string): Promise<Appointment[]> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  let query = supabaseAdmin
    .from('appointments')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (startDate) {
    query = query.gte('appointment_date', startDate)
  }

  if (endDate) {
    query = query.lte('appointment_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as Appointment[]
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Appointment
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']): Promise<Appointment> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('id', id)
    .single()

  if (error || !appointment) {
    throw new Error(error?.message || 'Failed to update appointment status')
  }

  return appointment as Appointment
}

export async function updateAppointment(id: string, updates: Partial<AppointmentFormData>): Promise<Appointment> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('id', id)
    .single()

  if (error || !appointment) {
    throw new Error(error?.message || 'Failed to update appointment')
  }

  return appointment as Appointment
}

export async function deleteAppointment(id: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getAppointmentStats(startDate?: string, endDate?: string): Promise<AppointmentStats> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const today = new Date().toISOString().split('T')[0]

  let query = supabaseAdmin
    .from('appointments')
    .select('status', { count: 'exact' })

  if (startDate) {
    query = query.gte('appointment_date', startDate)
  }

  if (endDate) {
    query = query.lte('appointment_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const stats = {
    todayTotal: 0,
    arrived: 0,
    checkedIn: 0,
    completedToday: 0,
    noShows: 0,
    upcomingToday: 0,
  }

  data?.forEach((apt) => {
    stats.todayTotal++
    if (apt.status === 'Arrived') stats.arrived++
    if (apt.status === 'Checked In') stats.checkedIn++
    if (apt.status === 'Completed') stats.completedToday++
    if (apt.status === 'No Show') stats.noShows++
  })

  return stats
}
