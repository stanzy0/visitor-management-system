import { supabaseAdmin } from '@/lib/supabase-admin'
import type { DocumentVerification, DocumentVerificationFilters, DocumentVerificationStats } from '@/lib/types/document-verification'

export async function getPendingDocuments(limit = 50, offset = 0): Promise<DocumentVerification[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .eq('status', 'Pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch pending documents:', error)
    return []
  }

  return (data || []) as DocumentVerification[]
}

export async function getDocumentVerifications(
  filters: DocumentVerificationFilters,
  limit = 20,
  offset = 0
): Promise<{ data: DocumentVerification[]; total: number }> {
  if (!supabaseAdmin) return { data: [], total: 0 }

  let query = supabaseAdmin
    .from('document_verifications')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.search) {
    query = query.or(`document_type.ilike.%${filters.search}%,visitors.full_name.ilike.%${filters.search}%`)
  }

  if (filters.document_type) {
    query = query.eq('document_type', filters.document_type)
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch document verifications:', error)
    return { data: [], total: 0 }
  }

  return { data: (data || []) as DocumentVerification[], total: count || 0 }
}

export async function getDocumentVerificationStats(): Promise<DocumentVerificationStats> {
  if (!supabaseAdmin) {
    return { pending: 0, approved: 0, rejected: 0, replacement_requested: 0, reuploaded: 0, total: 0, today_reviews: 0 }
  }

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .select('status, created_at')

  if (error || !data) {
    return { pending: 0, approved: 0, rejected: 0, replacement_requested: 0, reuploaded: 0, total: 0, today_reviews: 0 }
  }

  const today = new Date().toISOString().split('T')[0]
  const stats: DocumentVerificationStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    replacement_requested: 0,
    reuploaded: 0,
    total: data.length,
    today_reviews: 0,
  }

  data.forEach((item: { status: string; created_at: string }) => {
    if (item.status === 'Pending') stats.pending++
    else if (item.status === 'Approved') stats.approved++
    else if (item.status === 'Rejected') stats.rejected++
    else if (item.status === 'Replacement Requested') stats.replacement_requested++
    else if (item.status === 'Reuploaded') stats.reuploaded++

    if (item.created_at.startsWith(today)) stats.today_reviews++
  })

  return stats
}

export async function approveDocument(
  verificationId: string,
  approvedBy: string,
  notes?: string
): Promise<DocumentVerification | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .update({
      status: 'Approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .single()

  if (error || !data) {
    console.error('Failed to approve document:', error)
    return null
  }

  return data as DocumentVerification
}

export async function rejectDocument(
  verificationId: string,
  rejectedBy: string,
  reason: string
): Promise<DocumentVerification | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .update({
      status: 'Rejected',
      rejected_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .single()

  if (error || !data) {
    console.error('Failed to reject document:', error)
    return null
  }

  return data as DocumentVerification
}

export async function requestReplacement(
  verificationId: string,
  reason: string
): Promise<DocumentVerification | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .update({
      status: 'Replacement Requested',
      replacement_requested: true,
      rejected_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .single()

  if (error || !data) {
    console.error('Failed to request replacement:', error)
    return null
  }

  return data as DocumentVerification
}

export async function markReplacementUploaded(verificationId: string): Promise<DocumentVerification | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .update({
      status: 'Reuploaded',
      replacement_uploaded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .single()

  if (error || !data) {
    console.error('Failed to mark replacement uploaded:', error)
    return null
  }

  return data as DocumentVerification
}

export async function getVerificationHistory(visitorId: string): Promise<DocumentVerification[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url),
      visit:visits(status, employee:employees(full_name, department))
    `)
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch verification history:', error)
    return []
  }

  return (data || []) as DocumentVerification[]
}

export async function downloadDocument(verificationId: string): Promise<{ url: string; filename: string } | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('document_verifications')
    .select('document_url, document_type')
    .eq('id', verificationId)
    .single()

  if (error || !data) {
    console.error('Failed to get document:', error)
    return null
  }

  return {
    url: data.document_url,
    filename: `${data.document_type.replace(/\s+/g, '_')}_${verificationId}`,
  }
}
