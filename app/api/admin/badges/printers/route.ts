import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getPrinters, getDefaultPrinter, createPrinter, updatePrinter, deletePrinter } from '@/lib/server/badges'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const printers = await getPrinters()
    const defaultPrinter = await getDefaultPrinter()
    return NextResponse.json({ success: true, data: printers, default: defaultPrinter })
  } catch (err) {
    console.error('Fetch printers error:', err)
    return NextResponse.json({ error: 'Failed to fetch printers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const printer = await createPrinter(body)
    return NextResponse.json({ success: true, data: printer }, { status: 201 })
  } catch (err) {
    console.error('Create printer error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create printer' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Printer ID is required' }, { status: 400 })
    }

    const printer = await updatePrinter(id, updates)
    return NextResponse.json({ success: true, data: printer })
  } catch (err) {
    console.error('Update printer error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update printer' }, { status: 500 })
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
      return NextResponse.json({ error: 'Printer ID is required' }, { status: 400 })
    }

    await deletePrinter(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete printer error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete printer' }, { status: 500 })
  }
}
