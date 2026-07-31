import { VisitorDocument, DocumentType, VerificationStatus } from '@/lib/types/document'

export interface DocumentFilters {
  search?: string
  document_type?: DocumentType
  verification_status?: VerificationStatus
  visitor_id?: string
  limit?: number
  offset?: number
}

export interface DocumentListResponse {
  data: VisitorDocument[]
  total: number
  limit: number
  offset: number
}

const API_BASE = '/api/documents'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { getAuthHeaders } = await import('@/lib/client/api')
  return getAuthHeaders()
}

export async function getDocuments(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.document_type) params.set('document_type', filters.document_type)
  if (filters.verification_status) params.set('verification_status', filters.verification_status)
  if (filters.visitor_id) params.set('visitor_id', filters.visitor_id)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch documents')
  }

  return res.json()
}

export async function getDocumentById(id: string): Promise<VisitorDocument> {
  const res = await fetch(`${API_BASE}/${id}`, {
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch document')
  }

  return res.json()
}

export async function createDocument(formData: FormData): Promise<VisitorDocument> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create document')
  }

  return res.json()
}

export async function updateDocument(id: string, updates: Partial<VisitorDocument>): Promise<VisitorDocument> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update document')
  }

  return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete document')
  }
}

export async function replaceDocument(id: string, file: File, mimeType: string): Promise<VisitorDocument> {
  const formData = new FormData()
  formData.append('action', 'replace')
  formData.append('file', file)
  formData.append('mime_type', mimeType)

  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to replace document')
  }

  return res.json()
}

export async function downloadDocument(id: string): Promise<{ url: string; file_name: string }> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action: 'download' }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to download document')
  }

  return res.json()
}

export async function verifyDocument(id: string, notes?: string): Promise<VisitorDocument> {
  return updateDocument(id, {
    verification_status: 'Verified',
    verified: true,
    verification_notes: notes || null,
  })
}

export async function rejectDocument(id: string, notes?: string): Promise<VisitorDocument> {
  return updateDocument(id, {
    verification_status: 'Rejected',
    verified: false,
    verification_notes: notes || null,
  })
}
