import { supabaseAdmin } from '@/lib/supabase-admin'
import type { VisitorBadge } from '@/lib/badge/badge-types'

export async function getBadge(id: string): Promise<VisitorBadge | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visitor_badges')
    .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department))')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as VisitorBadge
}

export async function getBadgeByVisit(visitId: string): Promise<VisitorBadge | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visitor_badges')
    .select('*, visit:visits(*, visitor:visitors(full_name, visitor_organization, photo_url), employee:employees(full_name, department))')
    .eq('visit_id', visitId)
    .single()

  if (error || !data) return null
  return data as VisitorBadge
}

export async function getBadgeQRCode(badgeId: string): Promise<string | null> {
  const badge = await getBadge(badgeId)
  if (!badge) return null

  return JSON.stringify({
    visitId: badge.visit_id,
    qrToken: badge.badge_number,
    type: 'visitor-pass',
    issuedAt: badge.issued_at,
  })
}

export async function getBadgePrintData(badgeId: string): Promise<VisitorBadge | null> {
  return getBadge(badgeId)
}
