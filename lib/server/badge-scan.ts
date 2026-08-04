import { supabaseAdmin } from '@/lib/supabase-admin'
import type { BadgeScanLog, BadgeVerificationRequest, BadgeVerificationResponse, VerificationResult, ScanHistoryFilters, ScanHistoryResponse } from '@/lib/types/badge-scan'

const DUPLICATE_SCAN_WINDOW_MS = 10_000

export async function verifyBadgeByQrToken(request: BadgeVerificationRequest): Promise<BadgeVerificationResponse> {
  if (!supabaseAdmin) {
    return { valid: false, status: 'INVALID', message: 'Service role key not configured' }
  }

  const { qr_token, scanner_name, device_name, location, latitude, longitude } = request

  if (!qr_token) {
    return { valid: false, status: 'INVALID', message: 'QR token is required' }
  }

  const { data: badge, error: badgeError } = await supabaseAdmin
    .from('visitor_badges')
    .select(`
      *,
      visit:visits(
        id,
        registration_number,
        status,
        purpose,
        check_in_time,
        check_out_time,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location)
      )
    `)
    .eq('qr_token', qr_token)
    .single()

  if (badgeError || !badge) {
    await logScan({
      qr_token,
      badge_id: null,
      visit_id: null,
      verification_result: 'INVALID',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'INVALID', message: 'Badge not found' }
  }

  const visit = Array.isArray(badge.visit) ? badge.visit[0] : badge.visit
  const visitor = visit?.visitor ? (Array.isArray(visit.visitor) ? visit.visitor[0] : visit.visitor) : null
  const employee = visit?.employee ? (Array.isArray(visit.employee) ? visit.employee[0] : visit.employee) : null

  if (!visit) {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'INVALID',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'INVALID', message: 'Linked visit not found' }
  }

  if (!visitor) {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'INVALID',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'INVALID', message: 'Visitor not found' }
  }

  const badgeStatus = badge.badge_status as string
  const isRevoked = badge.revoked === true
  const isExpired = badge.expires_at ? new Date(badge.expires_at) < new Date() : false

  if (isRevoked) {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'REVOKED',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'REVOKED', message: 'Badge has been revoked' }
  }

  if (isExpired) {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'EXPIRED',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'EXPIRED', message: 'Badge has expired' }
  }

  if (badgeStatus === 'SUSPENDED') {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'SUSPENDED',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'SUSPENDED', message: 'Badge is suspended' }
  }

  if (badgeStatus === 'Cancelled') {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'REVOKED',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'REVOKED', message: 'Badge has been cancelled' }
  }

  if (badgeStatus !== 'Active') {
    await logScan({
      qr_token,
      badge_id: badge.id,
      visit_id: badge.visit_id,
      verification_result: 'INVALID',
      scanner_name,
      device_name,
      location,
      latitude,
      longitude,
    })

    return { valid: false, status: 'INVALID', message: `Badge status is ${badgeStatus}` }
  }

  await logScan({
    qr_token,
    badge_id: badge.id,
    visit_id: badge.visit_id,
    verification_result: 'VALID',
    scanner_name,
    device_name,
    location,
    latitude,
    longitude,
  })

  return {
    valid: true,
    status: 'VALID',
    badge: {
      id: badge.id,
      badge_number: badge.badge_number,
      badge_status: badge.badge_status,
      issued_at: badge.issued_at,
      expires_at: badge.expires_at,
    },
    visitor: visitor ? {
      id: visitor.id,
      full_name: visitor.full_name,
      visitor_organization: visitor.visitor_organization,
      photo_url: visitor.photo_url,
    } : undefined,
    visit: visit ? {
      id: visit.id,
      registration_number: visit.registration_number,
      status: visit.status,
      purpose: visit.purpose,
      check_in_time: visit.check_in_time,
      check_out_time: visit.check_out_time,
    } : undefined,
    employee: employee ? {
      full_name: employee.full_name,
      department: employee.department,
      office_location: employee.office_location,
    } : null,
  }
}

export async function checkDuplicateScan(qr_token: string): Promise<{ duplicate: boolean; lastScan?: BadgeScanLog }> {
  if (!supabaseAdmin) {
    return { duplicate: false }
  }

  const cutoff = new Date(Date.now() - DUPLICATE_SCAN_WINDOW_MS).toISOString()

  const { data: recentScan, error } = await supabaseAdmin
    .from('badge_scan_logs')
    .select('*')
    .eq('qr_token', qr_token)
    .gte('scanned_at', cutoff)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !recentScan) {
    return { duplicate: false }
  }

  return {
    duplicate: true,
    lastScan: recentScan as BadgeScanLog,
  }
}

export async function logScan(params: {
  qr_token: string
  badge_id: string | null
  visit_id: string | null
  verification_result: VerificationResult
  scanner_name?: string | null
  device_name?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  scanned_by?: string | null
  ip_address?: string | null
  user_agent?: string | null
}): Promise<BadgeScanLog | null> {
  if (!supabaseAdmin) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('badge_scan_logs')
    .insert({
      badge_id: params.badge_id,
      visit_id: params.visit_id,
      qr_token: params.qr_token,
      verification_result: params.verification_result,
      scanned_by: params.scanned_by || null,
      scanner_name: params.scanner_name || null,
      device_name: params.device_name || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
      location: params.location || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[BadgeScanLog] Failed to log scan', {
      qr_token: params.qr_token,
      error: error?.message,
      timestamp: new Date().toISOString(),
    })
    return null
  }

  return data as BadgeScanLog
}

export async function getScanHistory(filters: ScanHistoryFilters): Promise<ScanHistoryResponse> {
  if (!supabaseAdmin) {
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }

  const page = filters.page || 1
  const limit = filters.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('badge_scan_logs')
    .select('*', { count: 'exact' })
    .order('scanned_at', { ascending: false })
    .range(from, to)

  if (filters.badge_id) {
    query = query.eq('badge_id', filters.badge_id)
  }

  if (filters.qr_token) {
    query = query.eq('qr_token', filters.qr_token)
  }

  if (filters.verification_result) {
    query = query.eq('verification_result', filters.verification_result)
  }

  if (filters.date_from) {
    query = query.gte('scanned_at', filters.date_from)
  }

  if (filters.date_to) {
    query = query.lte('scanned_at', filters.date_to)
  }

  if (filters.scanner_name) {
    query = query.ilike('scanner_name', `%${filters.scanner_name}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[BadgeScanLog] Failed to fetch scan history', {
      error: error.message,
      timestamp: new Date().toISOString(),
    })
    return { data: [], total: 0, page, limit, totalPages: 0 }
  }

  return {
    data: (data || []) as BadgeScanLog[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}
