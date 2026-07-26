import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'
import type { PortalVisit, PortalLifecycleEvent, PortalDocument, PortalSecurityAlert } from '@/lib/types/portal'

export async function getPortalVisitByRegistrationNumber(registrationNumber: string): Promise<PortalVisit | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select(`
      id,
      registration_number,
      status,
      visitor_type,
      source,
      rejection_reason,
      check_in_time,
      check_out_time,
      created_at,
      visitor:visitors(*),
      employee:employees(*),
      appointment:appointments(*),
      badge:visitor_badges(*)
    `)
    .eq('source', 'public')
    .eq('registration_number', registrationNumber)
    .single()

  if (error || !data) {
    return null
  }

  return transformVisit(data as RawVisit)
}

export async function getPortalVisitByQRToken(qrToken: string): Promise<PortalVisit | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: badge } = await supabaseAdmin
    .from('visitor_badges')
    .select('visit_id')
    .eq('qr_token', qrToken)
    .single()

  if (!badge) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select(`
      id,
      registration_number,
      status,
      visitor_type,
      source,
      rejection_reason,
      check_in_time,
      check_out_time,
      created_at,
      visitor:visitors(*),
      employee:employees(*),
      appointment:appointments(*),
      badge:visitor_badges(*)
    `)
    .eq('id', badge.visit_id)
    .eq('source', 'public')
    .single()

  if (error || !data) {
    return null
  }

  return transformVisit(data as RawVisit)
}

export async function getPortalLifecycleEvents(visitId: string): Promise<PortalLifecycleEvent[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('lifecycle_events')
    .select('*')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as PortalLifecycleEvent[]
}

export async function getPortalDocuments(visitorId: string): Promise<PortalDocument[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .select('*')
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as PortalDocument[]
}

export async function getPortalSecurityAlerts(visitId: string): Promise<PortalSecurityAlert[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('security_alerts')
    .select('*')
    .eq('related_id', visitId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as PortalSecurityAlert[]
}

export async function replacePortalDocument(documentId: string, file: File, visitorId: string, visitId: string): Promise<PortalDocument> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-')
  const fileName = `portal-${visitId}-${Date.now()}-${sanitizedFileName}`

  const { error: uploadError } = await supabaseAdmin.storage.from('visitor-photos').upload(fileName, file)
  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload document')
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('visitor-photos').getPublicUrl(fileName)

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .update({
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('visitor_id', visitorId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update document')
  }

  await logAuditAction('Visitor Replaced Document', 'visitor_document', documentId, `Visitor replaced document ${documentId}`)

  return data as PortalDocument
}

export async function removePortalDocument(documentId: string, visitorId: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('visitor_documents')
    .delete()
    .eq('id', documentId)
    .eq('visitor_id', visitorId)

  if (error) {
    throw new Error(error.message)
  }

  await logAuditAction('Visitor Removed Document', 'visitor_document', documentId, `Visitor removed document ${documentId}`)
}

export async function logPortalAudit(action: string, visitId: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await logAuditAction(`Visitor Portal ${action}`, 'portal', visitId, JSON.stringify(metadata))
}

interface RawVisit {
  id: string
  registration_number: string
  status: string
  visitor_type: string
  source: string
  rejection_reason: string | null
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  visitor: RawVisitor | RawVisitor[] | null
  employee: RawEmployee | RawEmployee[] | null
  appointment: RawAppointment | RawAppointment[] | null
  badge: RawBadge | RawBadge[] | null
}

interface RawVisitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string | null
  photo_url: string | null
  nationality: string | null
  gender: string | null
}

interface RawEmployee {
  id: string
  full_name: string
  department: string | null
  office_location: string | null
  phone_extension: string | null
  email: string | null
}

interface RawAppointment {
  id: string
  appointment_date: string
  appointment_time: string | null
  expected_arrival: string | null
  status: string
  purpose: string
}

interface RawBadge {
  id: string
  badge_number: string
  qr_token: string
  issued_at: string | null
  expires_at: string | null
  badge_status: string
}

function transformVisit(data: RawVisit): PortalVisit {
  const visitor = Array.isArray(data.visitor) ? data.visitor[0] : data.visitor
  const employee = Array.isArray(data.employee) ? data.employee[0] : data.employee
  const appointment = Array.isArray(data.appointment) ? data.appointment[0] : data.appointment
  const badge = Array.isArray(data.badge) ? data.badge[0] : data.badge

  return {
    id: data.id,
    registration_number: data.registration_number,
    status: data.status as PortalVisit['status'],
    visitor_type: data.visitor_type,
    source: data.source,
    rejection_reason: data.rejection_reason,
    check_in_time: data.check_in_time,
    check_out_time: data.check_out_time,
    created_at: data.created_at,
    visitor: (visitor || null) as PortalVisit['visitor'],
    employee: employee || null,
    appointment: appointment || null,
    badge: badge || null,
  }
}
