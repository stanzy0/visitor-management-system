import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getWatchlistEntries, createWatchlistEntry, updateWatchlistEntry, deleteWatchlistEntry } from '@/lib/server/security'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const entries = await getWatchlistEntries()
    return NextResponse.json({ success: true, data: entries })
  } catch (err) {
    console.error('Watchlist fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const entry = await createWatchlistEntry(body, authResult.userEmail || 'admin')
    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (err) {
    console.error('Watchlist create error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create watchlist entry' }, { status: 500 })
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const entry = await updateWatchlistEntry(id, updates)
    return NextResponse.json({ success: true, data: entry })
  } catch (err) {
    console.error('Watchlist update error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update watchlist entry' }, { status: 500 })
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await deleteWatchlistEntry(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Watchlist delete error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete watchlist entry' }, { status: 500 })
  }
}
