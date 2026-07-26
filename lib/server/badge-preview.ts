import { supabaseAdmin } from '@/lib/supabase-admin'
import type { BadgePreviewVisit, BadgeTemplateOption } from '@/lib/types/badge-preview'

export async function getVisitForBadgePreview(visitId: string): Promise<BadgePreviewVisit | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select(`
      *,
      visitor:visitors(*),
      employee:employees(*),
      appointment:appointments(*)
    `)
    .eq('id', visitId)
    .single()

  if (error || !data) return null

  return transformVisit(data as any)
}

export async function getBadgeTemplates(): Promise<BadgeTemplateOption[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('badge_templates')
    .select('*')
    .order('name', { ascending: true })

  if (error || !data || data.length === 0) {
    return getDefaultTemplates()
  }

  return data as BadgeTemplateOption[]
}

export async function getDefaultTemplates(): Promise<BadgeTemplateOption[]> {
  return [
    {
      id: 'standard',
      name: 'Standard Visitor',
      description: 'Default visitor badge template',
      badge_size: 'standard',
      orientation: 'landscape',
      primary_color: '#2563eb',
      secondary_color: '#1e40af',
      text_color: '#1f2937',
      qr_position: 'right',
      photo_position: 'left',
      expiry_display: true,
      department_display: true,
      office_display: true,
      signature_area: false,
      layout: [],
      is_default: true,
    },
    {
      id: 'contractor',
      name: 'Contractor',
      description: 'Badge for contract workers',
      badge_size: 'standard',
      orientation: 'landscape',
      primary_color: '#d97706',
      secondary_color: '#92400e',
      text_color: '#1f2937',
      qr_position: 'right',
      photo_position: 'left',
      expiry_display: true,
      department_display: true,
      office_display: true,
      signature_area: true,
      layout: [],
      is_default: false,
    },
    {
      id: 'vip',
      name: 'VIP',
      description: 'VIP visitor badge',
      badge_size: 'standard',
      orientation: 'landscape',
      primary_color: '#7c3aed',
      secondary_color: '#5b21b6',
      text_color: '#1f2937',
      qr_position: 'right',
      photo_position: 'left',
      expiry_display: true,
      department_display: true,
      office_display: true,
      signature_area: false,
      layout: [],
      is_default: false,
    },
    {
      id: 'vendor',
      name: 'Vendor',
      description: 'Vendor/supplier badge',
      badge_size: 'standard',
      orientation: 'landscape',
      primary_color: '#059669',
      secondary_color: '#047857',
      text_color: '#1f2937',
      qr_position: 'right',
      photo_position: 'left',
      expiry_display: true,
      department_display: true,
      office_display: true,
      signature_area: true,
      layout: [],
      is_default: false,
    },
    {
      id: 'guest-lecturer',
      name: 'Guest Lecturer',
      description: 'Guest lecturer/academic visitor badge',
      badge_size: 'standard',
      orientation: 'landscape',
      primary_color: '#dc2626',
      secondary_color: '#b91c1c',
      text_color: '#1f2937',
      qr_position: 'right',
      photo_position: 'left',
      expiry_display: true,
      department_display: true,
      office_display: true,
      signature_area: false,
      layout: [],
      is_default: false,
    },
  ]
}

function transformVisit(data: any): BadgePreviewVisit {
  const visitor = Array.isArray(data.visitor) ? data.visitor[0] : data.visitor
  const employee = Array.isArray(data.employee) ? data.employee[0] : data.employee
  const appointment = Array.isArray(data.appointment) ? data.appointment[0] : data.appointment

  return {
    id: data.id,
    registration_number: data.registration_number,
    status: data.status,
    visitor_type: data.visitor_type,
    source: data.source,
    purpose: data.purpose,
    visit_date: data.visit_date,
    arrival_time: data.arrival_time,
    expected_duration: data.expected_duration,
    office_location: data.office_location,
    check_in_time: data.check_in_time,
    check_out_time: data.check_out_time,
    created_at: data.created_at,
    rejection_reason: data.rejection_reason,
    visitor: visitor || null,
    employee: employee || null,
    appointment: appointment || null,
  }
}
