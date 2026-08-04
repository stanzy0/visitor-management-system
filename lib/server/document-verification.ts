import { supabaseAdmin } from '@/lib/supabase-admin'
import { VisitorDocument, VerificationStatus } from '@/lib/types/document'

export async function getPendingDocuments(limit = 50, offset = 0): Promise<VisitorDocument[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `)
    .eq('verification_status', 'Pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch pending documents:', error)
    return []
  }

  return (data || []) as VisitorDocument[]
}

export async function getDocumentVerifications(
  filters: {
    search?: string
    document_type?: string
    verification_status?: VerificationStatus | string
    date_from?: string
    date_to?: string
  },
  limit = 20,
  offset = 0
): Promise<{ data: VisitorDocument[]; total: number }> {
  if (!supabaseAdmin) return { data: [], total: 0 }

  let query = supabaseAdmin
    .from('visitor_documents')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.search) {
    query = query.or(`document_type.ilike.%${filters.search}%,visitors.full_name.ilike.%${filters.search}%`)
  }

  if (filters.document_type) {
    query = query.eq('document_type', filters.document_type)
  }

  const statusFilter = filters.verification_status
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('verification_status', statusFilter)
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

  return { data: (data || []) as VisitorDocument[], total: count || 0 }
}

export async function getDocumentVerificationStats(): Promise<{
  pending: number
  verified: number
  rejected: number
  replacement_requested: number
  reuploaded: number
  total: number
  today_reviews: number
}> {
  if (!supabaseAdmin) {
    return { pending: 0, verified: 0, rejected: 0, replacement_requested: 0, reuploaded: 0, total: 0, today_reviews: 0 }
  }

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .select('verification_status, created_at')

  if (error || !data) {
    return { pending: 0, verified: 0, rejected: 0, replacement_requested: 0, reuploaded: 0, total: 0, today_reviews: 0 }
  }

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    pending: 0,
    verified: 0,
    rejected: 0,
    replacement_requested: 0,
    reuploaded: 0,
    total: data.length,
    today_reviews: 0,
  }

  data.forEach((item: { verification_status: string; created_at: string }) => {
    if (item.verification_status === 'Pending') stats.pending++
    else if (item.verification_status === 'Verified') stats.verified++
    else if (item.verification_status === 'Rejected') stats.rejected++
    else if (item.verification_status === 'Replacement Requested') stats.replacement_requested++
    else if (item.verification_status === 'Reuploaded') stats.reuploaded++

    if (item.created_at.startsWith(today)) stats.today_reviews++
  })

  return stats
}

export async function approveDocument(
  documentId: string,
  approvedBy: string,
  notes?: string
): Promise<VisitorDocument> {
   if (!supabaseAdmin) throw new Error('Service role key not configured')

   const { data, error } = await supabaseAdmin
     .from('visitor_documents')
     .update({
       verification_status: 'Verified',
      verified: true,
      verified_by: approvedBy,
      verified_at: new Date().toISOString(),
      verification_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
     .eq('id', documentId)
     .select(`
       *,
       visitor:visitors(full_name, email, visitor_organization, photo_url)
     `)
     .single()

   if (error) {
     throw error
   }

   return data as VisitorDocument
 }

 export async function rejectDocument(
  documentId: string,
  rejectedBy: string,
  reason: string
): Promise<VisitorDocument> {
   if (!supabaseAdmin) throw new Error('Service role key not configured')

   const { data, error } = await supabaseAdmin
     .from('visitor_documents')
     .update({
       verification_status: 'Rejected',
      verified: false,
      verification_notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `)
     .single()

   if (error) {
     throw error
   }

   return data as VisitorDocument
 }

 export async function requestReplacement(
  documentId: string,
  reason: string
): Promise<VisitorDocument> {
   if (!supabaseAdmin) throw new Error('Service role key not configured')

   const { data, error } = await supabaseAdmin
     .from('visitor_documents')
     .update({
       verification_status: 'Replacement Requested',
      replacement_requested: true,
      verification_notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `)
     .single()

   if (error) {
     throw error
   }

   return data as VisitorDocument
 }

 export async function markReplacementUploaded(documentId: string): Promise<VisitorDocument> {
   if (!supabaseAdmin) throw new Error('Service role key not configured')

   const { data, error } = await supabaseAdmin
     .from('visitor_documents')
     .update({
       verification_status: 'Reuploaded',
      replacement_uploaded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `)
     .single()

   if (error) {
     throw error
   }

   return data as VisitorDocument
 }

export async function getVerificationHistory(visitorId: string): Promise<VisitorDocument[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .select(`
      *,
      visitor:visitors(full_name, email, visitor_organization, photo_url)
    `)
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch verification history:', error)
    return []
  }

  return (data || []) as VisitorDocument[]
}

export async function downloadDocument(documentId: string): Promise<{ url: string; filename: string } | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visitor_documents')
    .select('file_url, front_image_url, document_type')
    .eq('id', documentId)
    .single()

  if (error || !data) {
    console.error('Failed to get document:', error)
    return null
  }

  const fileUrl = data.file_url || data.front_image_url
  if (!fileUrl) return null

  return {
    url: fileUrl,
    filename: `${data.document_type.replace(/\s+/g, '_')}_${documentId}`,
  }
}
