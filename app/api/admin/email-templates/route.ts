import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getEmailTemplates, upsertEmailTemplate, deleteEmailTemplate } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const templates = await getEmailTemplates()
    return NextResponse.json({ success: true, data: templates })
  } catch (err) {
    console.error('Fetch email templates error:', err)
    return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const template = await upsertEmailTemplate(body)
    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (err) {
    console.error('Create email template error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create email template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const template = await upsertEmailTemplate(body)
    return NextResponse.json({ success: true, data: template })
  } catch (err) {
    console.error('Update email template error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update email template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    await deleteEmailTemplate(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete email template error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete email template' }, { status: 500 })
  }
}
