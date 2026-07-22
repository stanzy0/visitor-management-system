'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { VisitorDocument } from '@/lib/types/document'
import {
  DocumentFilters,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  replaceDocument,
  verifyDocument,
  rejectDocument,
} from '@/lib/client/documents'
import { logAuditAction } from '@/lib/client/audit'

export function useDocuments(filters: DocumentFilters = {}) {
  const [documents, setDocuments] = useState<VisitorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDocuments(filters)
      setDocuments(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchDocumentsRef = useRef(fetchDocuments)
  useEffect(() => {
    fetchDocumentsRef.current = fetchDocuments
  })

  useEffect(() => {
    fetchDocumentsRef.current()
  }, [filters])

  useEffect(() => {
    const channel = supabase
      .channel('documents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_documents' },
        () => {
          fetchDocumentsRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const create = async (formData: FormData) => {
    const doc = await createDocument(formData)
    await logAuditAction('Document Uploaded', 'visitor_document', doc.id, `Document ${doc.document_type} uploaded`)
    return doc
  }

  const update = async (id: string, updates: Partial<VisitorDocument>) => {
    const doc = await updateDocument(id, updates)
    await logAuditAction('Document Updated', 'visitor_document', id, `Document ${id} updated`)
    return doc
  }

  const remove = async (id: string) => {
    await deleteDocument(id)
    await logAuditAction('Document Deleted', 'visitor_document', id, `Document ${id} deleted`)
  }

  const replace = async (id: string, file: File, mimeType: string) => {
    const doc = await replaceDocument(id, file, mimeType)
    await logAuditAction('Document Replaced', 'visitor_document', id, `Document ${id} replaced`)
    return doc
  }

  const verify = async (id: string, notes?: string) => {
    const doc = await verifyDocument(id, notes)
    await logAuditAction('Document Verified', 'visitor_document', id, `Document ${id} verified`)
    return doc
  }

  const reject = async (id: string, notes?: string) => {
    const doc = await rejectDocument(id, notes)
    await logAuditAction('Document Rejected', 'visitor_document', id, `Document ${id} rejected`)
    return doc
  }

  return {
    documents,
    loading,
    error,
    total,
    refetch: fetchDocuments,
    create,
    update,
    remove,
    replace,
    verify,
    reject,
  }
}

export function useVisitorDocuments(visitorId: string) {
  return useDocuments({ visitor_id: visitorId, limit: 100 })
}
