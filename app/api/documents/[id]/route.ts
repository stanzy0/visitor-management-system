import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAction } from '@/lib/client/audit'
import { VisitorDocument, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/types/document'
import { approveDocument, rejectDocument, requestReplacement, markReplacementUploaded, getDocumentVerifications } from '@/lib/server/document-verification'
import { createAdminNotification, createReceptionistNotification, createHostNotification, createSystemNotification } from '@/lib/notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('visitor_documents')
      .select(`
        *,
        visitor:visitors(full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(data as VisitorDocument)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'document_type',
      'document_number',
      'issuing_country',
      'expiry_date',
      'notes',
      'verification_status',
      'verification_notes',
      'verified_by',
      'verified_at',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (body.verification_status && ['Pending', 'Verified', 'Rejected'].includes(body.verification_status)) {
      updates.verification_status = body.verification_status
      if (body.verification_status === 'Verified') {
        updates.verified_by = user.id
        updates.verified_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('visitor_documents')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        visitor:visitors(full_name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const action = body.verification_status === 'Verified'
      ? 'Document Verified'
      : body.verification_status === 'Rejected'
        ? 'Document Rejected'
        : 'Document Updated'

    await logAuditAction(action, 'visitor_document', id, `Document ${id} ${action.toLowerCase()}`)

    return NextResponse.json(data as VisitorDocument)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: existing } = await supabase
      .from('visitor_documents')
      .select('file_url, visitor_id')
      .eq('id', id)
      .single()

    if (existing?.file_url) {
      const path = existing.file_url.split('/visitor-documents/')[1]
      if (path) {
        await supabase.storage.from('visitor-documents').remove([path])
      }
    }

    const { error } = await supabase
      .from('visitor_documents')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditAction('Document Deleted', 'visitor_document', id, `Document ${id} deleted`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()
    const action = formData.get('action') as string
    const file = formData.get('file') as File | null
    const mimeType = formData.get('mime_type') as string | null
    const notes = formData.get('notes') as string | null
    const reason = formData.get('reason') as string | null

    const { data: existing } = await supabase
      .from('visitor_documents')
      .select('visitor_id, file_url, visit_id, document_type')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (action === 'approve') {
      const verification = await approveDocument(id, user.id, notes || undefined)
      if (!verification) {
        return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 })
      }

      await logAuditAction('Document Approved', 'visitor_document', id, `Document ${existing.document_type} approved for visitor ${existing.visitor_id}`)

      supabase.from('visitor_documents').select('visitor_id, visit_id').eq('id', id).single().then(({ data: doc }) => {
        if (doc?.visit_id) {
          supabase.from('visits').select('employee_id').eq('id', doc.visit_id).single().then(({ data: visit }) => {
            if (visit?.employee_id) {
              createHostNotification(
                visit.employee_id,
                'Visitor Documents Approved',
                `Documents for your visitor have been approved.`,
                'visitor',
                'visitor_document',
                id
              ).catch(() => {})
            }
          })
        }
        if (doc?.visitor_id) {
          supabase.from('visitors').select('email').eq('id', doc.visitor_id).single().then(({ data: visitor }) => {
            if (visitor?.email) {
              createSystemNotification(
                'Document Approved',
                `Your ${existing.document_type} has been approved.`,
                'success',
                'visitor_document',
                id
              ).catch(() => {})
            }
          })
        }
      })

      return NextResponse.json({ success: true, data: verification })
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }

      const verification = await rejectDocument(id, user.id, reason)
      if (!verification) {
        return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 })
      }

      await logAuditAction('Document Rejected', 'visitor_document', id, `Document ${existing.document_type} rejected for visitor ${existing.visitor_id}`)

      supabase.from('visitor_documents').select('visitor_id').eq('id', id).single().then(({ data: doc }) => {
        if (doc?.visitor_id) {
          supabase.from('visitors').select('email').eq('id', doc.visitor_id).single().then(({ data: visitor }) => {
            if (visitor?.email) {
              createSystemNotification(
                'Document Rejected',
                `Your ${existing.document_type} has been rejected. Reason: ${reason}`,
                'error',
                'visitor_document',
                id
              ).catch(() => {})
            }
          })
        }
      })

      return NextResponse.json({ success: true, data: verification })
    }

    if (action === 'replacement') {
      if (!reason) {
        return NextResponse.json({ error: 'Replacement reason is required' }, { status: 400 })
      }

      const verification = await requestReplacement(id, reason)
      if (!verification) {
        return NextResponse.json({ error: 'Failed to request replacement' }, { status: 500 })
      }

      await logAuditAction('Replacement Requested', 'visitor_document', id, `Replacement requested for document ${existing.document_type}`)

      supabase.from('visitor_documents').select('visitor_id').eq('id', id).single().then(({ data: doc }) => {
        if (doc?.visitor_id) {
          supabase.from('visitors').select('email').eq('id', doc.visitor_id).single().then(({ data: visitor }) => {
            if (visitor?.email) {
              createSystemNotification(
                'Replacement Requested',
                `Please upload a replacement for your ${existing.document_type}. Reason: ${reason}`,
                'warning',
                'visitor_document',
                id
              ).catch(() => {})
            }
          })
        }
      })

      return NextResponse.json({ success: true, data: verification })
    }

    if (action === 'mark_replacement_uploaded') {
      const verification = await markReplacementUploaded(id)
      if (!verification) {
        return NextResponse.json({ error: 'Failed to mark replacement uploaded' }, { status: 500 })
      }

      await logAuditAction('Replacement Uploaded', 'visitor_document', id, `Replacement uploaded for document ${existing.document_type}`)

      createReceptionistNotification(
        'Replacement Uploaded',
        `A replacement document has been uploaded and is ready for review.`,
        'info',
        'visitor_document',
        id
      ).catch(() => {})

      return NextResponse.json({ success: true, data: verification })
    }

    if (action === 'replace' && file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}` },
          { status: 400 }
        )
      }

      if (existing.file_url) {
        const path = existing.file_url.split('/visitor-documents/')[1]
        if (path) {
          await supabase.storage.from('visitor-documents').remove([path])
        }
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-')
      const uniqueFileName = `${existing.visitor_id}/${Date.now()}-${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('visitor-documents')
        .upload(uniqueFileName, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage
        .from('visitor-documents')
        .getPublicUrl(uniqueFileName)

      const { data, error } = await supabase
        .from('visitor_documents')
        .update({
          file_name: file.name,
          file_url: publicUrlData.publicUrl,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          replacement_uploaded: true,
        })
        .eq('id', id)
        .select(`
          *,
          visitor:visitors(full_name, email)
        `)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAuditAction('Document Replaced', 'visitor_document', id, `Document ${id} replaced`)

      return NextResponse.json(data as VisitorDocument)
    }

    if (action === 'download') {
      const { data: doc } = await supabase
        .from('visitor_documents')
        .select('file_url, file_name, document_type')
        .eq('id', id)
        .single()

      if (!doc?.file_url) {
        return NextResponse.json({ error: 'No file available' }, { status: 404 })
      }

      await logAuditAction('Document Downloaded', 'visitor_document', id, `Document ${doc.document_type} downloaded`)

      return NextResponse.json({ url: doc.file_url, file_name: doc.file_name })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


