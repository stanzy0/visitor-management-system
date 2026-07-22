import { supabaseAdmin } from '@/lib/supabase-admin'
import type { VisitorInvitation, InvitationFormData } from '@/lib/types/invitation'

export async function generateInvitationToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createInvitation(data: InvitationFormData, hostEmployeeId: string, createdBy: string): Promise<VisitorInvitation> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const token = await generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabaseAdmin
    .from('visitor_invitations')
    .insert({
      invitation_token: token,
      host_employee_id: hostEmployeeId,
      visitor_name: data.visitor_name,
      visitor_email: data.visitor_email,
      visitor_phone: data.visitor_phone || null,
      visitor_organization: data.visitor_organization || null,
      purpose: data.purpose,
      expected_date: data.expected_date,
      expected_time: data.expected_time || null,
      vehicle_required: data.vehicle_required,
      number_of_visitors: data.number_of_visitors,
      notes: data.notes || null,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !invitation) {
    throw new Error(error?.message || 'Failed to create invitation')
  }

  return invitation as VisitorInvitation
}

export async function getInvitationByToken(token: string): Promise<VisitorInvitation | null> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*, host:employees(*, user:user_roles(*))')
    .eq('invitation_token', token)
    .single()

  if (error || !data) return null
  return data as any
}

export async function getInvitationsByHost(hostEmployeeId: string): Promise<VisitorInvitation[]> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*')
    .eq('host_employee_id', hostEmployeeId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as VisitorInvitation[]
}

export async function getAllInvitations(): Promise<VisitorInvitation[]> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*, host:employees(*, user:user_roles(*))')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function updateInvitationStatus(token: string, status: VisitorInvitation['status']): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const updates: any = { status, updated_at: new Date().toISOString() }

  if (status === 'Completed') {
    updates.registration_completed_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('visitor_invitations')
    .update(updates)
    .eq('invitation_token', token)

  if (error) {
    throw new Error(error.message)
  }
}

export async function approveInvitation(token: string): Promise<VisitorInvitation> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: invitation, error: fetchError } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*')
    .eq('invitation_token', token)
    .single()

  if (fetchError || !invitation) {
    throw new Error('Invitation not found')
  }

  const { data: visitor } = await supabaseAdmin
    .from('visitors')
    .select('id')
    .eq('email', invitation.visitor_email)
    .maybeSingle()

  let visitorId = visitor?.id

  if (!visitorId) {
    const { data: newVisitor, error: visitorError } = await supabaseAdmin
      .from('visitors')
      .insert({
        full_name: invitation.visitor_name,
        email: invitation.visitor_email,
        phone: invitation.visitor_phone || null,
        visitor_organization: invitation.visitor_organization || null,
      })
      .select('id')
      .single()

    if (visitorError || !newVisitor) {
      throw new Error(visitorError?.message || 'Failed to create visitor')
    }

    visitorId = newVisitor.id
  }

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from('appointments')
    .insert({
      visitor_id: visitorId,
      employee_id: invitation.host_employee_id,
      appointment_date: invitation.expected_date,
      expected_arrival: invitation.expected_time || '09:00',
      expected_departure: invitation.expected_time || '17:00',
      purpose: invitation.purpose,
      notes: invitation.notes || '',
      status: 'Scheduled',
    })
    .select()
    .single()

  if (appointmentError || !appointment) {
    throw new Error(appointmentError?.message || 'Failed to create appointment')
  }

  const badgeNumberRes = await supabaseAdmin.rpc('generate_visitor_badge_number')
  if (badgeNumberRes.error || !badgeNumberRes.data) {
    throw new Error('Failed to generate badge number')
  }

  const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  const { data: badge, error: badgeError } = await supabaseAdmin
    .from('visitor_badges')
    .insert({
      visit_id: appointment.id,
      badge_number: badgeNumberRes.data,
      qr_token: qrToken,
      badge_status: 'Active',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (badgeError || !badge) {
    throw new Error(badgeError?.message || 'Failed to create badge')
  }

  const { error: updateError } = await supabaseAdmin
    .from('visitor_invitations')
    .update({
      status: 'Approved',
      updated_at: new Date().toISOString(),
      appointment_id: appointment.id,
      badge_id: badge.id,
    })
    .eq('invitation_token', token)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return { ...invitation, status: 'Approved', appointment_id: appointment.id, badge_id: badge.id } as VisitorInvitation
}

export async function rejectInvitation(token: string): Promise<VisitorInvitation> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .update({
      status: 'Rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('invitation_token', token)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to reject invitation')
  }

  return data as VisitorInvitation
}

export async function cancelInvitation(token: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { error } = await supabaseAdmin
    .from('visitor_invitations')
    .update({
      status: 'Cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('invitation_token', token)

  if (error) {
    throw new Error(error.message)
  }
}

export async function expireInvitations(): Promise<number> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .update({ status: 'Expired', updated_at: now })
    .eq('status', 'Pending')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return (data?.length || 0)
}

export async function getInvitationStats(startDate?: Date, endDate?: Date) {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  let query = supabaseAdmin
    .from('visitor_invitations')
    .select('status, expected_date, created_at')

  if (startDate) query = query.gte('created_at', startDate.toISOString()) as any
  if (endDate) query = query.lt('created_at', endDate.toISOString()) as any

  const { data } = await query

  const stats = {
    totalSent: 0,
    pending: 0,
    completed: 0,
    expired: 0,
    cancelled: 0,
    approved: 0,
    rejected: 0,
    byDate: [] as Array<{ date: string; count: number }>,
    byStatus: [] as Array<{ name: string; value: number }>,
  }

  if (!data) return stats

  const dateCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}

  for (const row of data as any[]) {
    stats.totalSent++
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
    const date = new Date(row.expected_date).toISOString().split('T')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  }

  stats.pending = statusCounts['Pending'] || 0
  stats.completed = statusCounts['Completed'] || 0
  stats.expired = statusCounts['Expired'] || 0
  stats.cancelled = statusCounts['Cancelled'] || 0
  stats.approved = statusCounts['Approved'] || 0
  stats.rejected = statusCounts['Rejected'] || 0

  stats.byDate = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count: count as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  stats.byStatus = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value: value as number }))

  return stats
}

export async function getPendingInvitations(): Promise<VisitorInvitation[]> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*, host:employees(*, user:user_roles(*))')
    .eq('status', 'Pending')
    .gte('expected_date', today)
    .order('expected_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function getTodayInvitations(): Promise<VisitorInvitation[]> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabaseAdmin
    .from('visitor_invitations')
    .select('*, host:employees(*, user:user_roles(*))')
    .eq('expected_date', today)
    .order('expected_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}
