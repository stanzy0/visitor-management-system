import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAction } from '@/lib/client/audit'
import { VisitorDocument, DOCUMENT_TYPES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/types/document'
import { createAdminNotification, createReceptionistNotification, createHostNotification, createSystemNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitor_id')
    const documentType = searchParams.get('document_type')
    const verificationStatus = searchParams.get('verification_status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('visitor_documents')
      .select(`
        *,
        visitor:visitors(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (visitorId) query = query.eq('visitor_id', visitorId)
    if (documentType) query = query.eq('document_type', documentType)
    if (verificationStatus) query = query.eq('verification_status', verificationStatus)
    if (search) {
      query = query.or(`document_number.ilike.%${search}%,visitors.full_name.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data as VisitorDocument[],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const visitor_id = formData.get('visitor_id') as string
    const document_type = formData.get('document_type') as string
    const document_number = formData.get('document_number') as string
    const issuing_country = formData.get('issuing_country') as string | null
    const expiry_date = formData.get('expiry_date') as string | null
    const notes = formData.get('notes') as string | null
    const visit_id = formData.get('visit_id') as string | null
    const file = formData.get('file') as File | null

    if (!visitor_id || !document_type || !document_number) {
      return NextResponse.json(
        { error: 'Missing required fields: visitor_id, document_type, document_number' },
        { status: 400 }
      )
    }

    if (!DOCUMENT_TYPES.includes(document_type as any)) {
      return NextResponse.json(
        { error: `Invalid document type. Allowed: ${DOCUMENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    let file_name: string | null = null
    let file_url: string | null = null
    let mime_type: string | null = null
    let file_size: number | null = null

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
          { status: 400 }
        )
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-')
      const uniqueFileName = `${visitor_id}/${Date.now()}-${sanitizedName}`
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

      file_name = file.name
      file_url = publicUrlData.publicUrl
      mime_type = file.type
      file_size = file.size
    }

    const { data, error } = await supabase
      .from('visitor_documents')
      .insert({
        visitor_id,
        document_type,
        document_number,
        issuing_country: issuing_country || null,
        expiry_date: expiry_date || null,
        visit_id: visit_id || null,
        file_name,
        file_url,
        mime_type,
        file_size,
        notes: notes || null,
        verification_status: 'Pending',
        uploaded_by: user.id,
      })
      .select(`
        *,
        visitor:visitors(full_name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditAction(
      'Document Uploaded',
      'visitor_document',
      data.id,
      `Document ${document_type} (${document_number}) uploaded for visitor ${visitor_id}`
    )

    createReceptionistNotification(
      'Document Uploaded',
      `New ${document_type} uploaded by visitor for review.`,
      'info',
      'visitor_document',
      data.id
    ).catch(() => {})

    if (visit_id) {
      supabase.from('visits').select('employee_id').eq('id', visit_id).single().then(({ data: visit }) => {
        if (visit?.employee_id) {
          createHostNotification(
            visit.employee_id,
            'Visitor Documents Uploaded',
            `A visitor has uploaded a ${document_type} for your upcoming visit.`,
            'visitor',
            'visitor_document',
            data.id
          ).catch(() => {})
        }
      })
    }

    return NextResponse.json(data as VisitorDocument, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


