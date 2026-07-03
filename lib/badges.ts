import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import QRCode from 'qrcode'

export interface VisitorBadge {
  id: string
  visit_id: string
  badge_number: string
  qr_token: string
  badge_status: 'Active' | 'Expired' | 'Checked Out' | 'Cancelled'
  issued_at: string
  expires_at: string
  printed_at: string | null
  printed_by: string | null
  reprint_count: number
  created_at: string
  updated_at: string
  visit?: {
    visitor: {
      full_name: string
      visitor_organization: string
      photo_url?: string | null
    } | null
    employee: {
      full_name: string
      department: string
    } | null
    purpose: string
  } | null
}

export interface BadgeFormData {
  visit_id: string
  badge_number?: string
  qr_token?: string
  badge_status?: string
  expires_at?: string
}

export async function generateBadgeNumber(): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .rpc('generate_visitor_badge_number')

  if (error || !data) {
    throw new Error(error?.message || 'Failed to generate badge number')
  }

  return data as string
}

export async function generateQrToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function generateBadgeQrCode(visitId: string, qrToken: string): Promise<string> {
  const payload = JSON.stringify({
    visitId,
    qrToken,
    type: 'visitor-pass',
    issuedAt: new Date().toISOString(),
  })
  return await QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}

export async function createBadge(visitId: string, expiresInHours: number = 24): Promise<VisitorBadge> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const badgeNumber = await generateBadgeNumber()
  const qrToken = await generateQrToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresInHours)

  const { data, error } = await supabaseAdmin
    .from('visitor_badges')
    .insert({
      visit_id: visitId,
      badge_number: badgeNumber,
      qr_token: qrToken,
      badge_status: 'Active',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create badge')
  }

  return data as VisitorBadge
}

export async function getBadgeByVisitId(visitId: string): Promise<VisitorBadge | null> {
  const { data, error } = await supabase
    .from('visitor_badges')
    .select('*')
    .eq('visit_id', visitId)
    .single()

  if (error || !data) return null
  return data as VisitorBadge
}

export async function getBadgeByQrToken(qrToken: string): Promise<VisitorBadge | null> {
  const { data, error } = await supabase
    .from('visitor_badges')
    .select('*, visit:visits(*, visitor:visitors(*), employee:employees(*))')
    .eq('qr_token', qrToken)
    .single()

  if (error || !data) return null
  return data as any
}

export async function getBadgeByBadgeNumber(badgeNumber: string): Promise<VisitorBadge | null> {
  const { data, error } = await supabase
    .from('visitor_badges')
    .select('*, visit:visits(*, visitor:visitors(*), employee:employees(*))')
    .eq('badge_number', badgeNumber)
    .single()

  if (error || !data) return null
  return data as any
}

export async function updateBadgeStatus(badgeId: string, status: VisitorBadge['badge_status']): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { error } = await supabaseAdmin
    .from('visitor_badges')
    .update({ badge_status: status, updated_at: new Date().toISOString() })
    .eq('id', badgeId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function printBadge(badgeId: string, userId?: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: badge } = await supabaseAdmin
    .from('visitor_badges')
    .select('reprint_count')
    .eq('id', badgeId)
    .single()

  if (!badge) {
    throw new Error('Badge not found')
  }

  const { error } = await supabaseAdmin
    .from('visitor_badges')
    .update({
      printed_at: new Date().toISOString(),
      printed_by: userId || null,
      reprint_count: (badge as any).reprint_count + 1,
    })
    .eq('id', badgeId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function reprintBadge(badgeId: string, userId?: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: badge } = await supabaseAdmin
    .from('visitor_badges')
    .select('reprint_count')
    .eq('id', badgeId)
    .single()

  if (!badge) {
    throw new Error('Badge not found')
  }

  const { error } = await supabaseAdmin
    .from('visitor_badges')
    .update({
      printed_at: new Date().toISOString(),
      printed_by: userId || null,
      reprint_count: (badge as any).reprint_count + 1,
    })
    .eq('id', badgeId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function cancelBadge(badgeId: string): Promise<void> {
  await updateBadgeStatus(badgeId, 'Cancelled')
}

export async function expireBadges(): Promise<number> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('visitor_badges')
    .update({ badge_status: 'Expired', updated_at: now })
    .eq('badge_status', 'Active')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return (data?.length || 0)
}

export async function getBadgesStats(startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('visitor_badges')
    .select('badge_status, created_at, printed_at, reprint_count')

  if (startDate) query = query.gte('created_at', startDate.toISOString()) as any
  if (endDate) query = query.lt('created_at', endDate.toISOString()) as any

  const { data } = await query

  const stats = {
    totalIssued: 0,
    totalPrinted: 0,
    activeBadges: 0,
    expiredBadges: 0,
    checkedOutBadges: 0,
    cancelledBadges: 0,
    reprints: 0,
    byDepartment: [] as Array<{ name: string; count: number }>,
  }

  if (!data) return stats

  const deptCounts: Record<string, number> = {}

  for (const row of data as any[]) {
    stats.totalIssued++
    if (row.printed_at) stats.totalPrinted++
    if (row.badge_status === 'Active') stats.activeBadges++
    if (row.badge_status === 'Expired') stats.expiredBadges++
    if (row.badge_status === 'Checked Out') stats.checkedOutBadges++
    if (row.badge_status === 'Cancelled') stats.cancelledBadges++
    stats.reprints += row.reprint_count || 0
  }

  return stats
}

export async function getBadgesByDepartment(startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('visitor_badges')
    .select('visit:visits(employee:employees(department))')
    .neq('badge_status', 'Cancelled')

  if (startDate) query = query.gte('created_at', startDate.toISOString()) as any
  if (endDate) query = query.lt('created_at', endDate.toISOString()) as any

  const { data } = await query

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: any) => {
    const dept = row.visit?.employee?.department || 'Unknown'
    counts[dept] = (counts[dept] || 0) + 1
  })

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
}
