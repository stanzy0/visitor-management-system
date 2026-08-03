import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getIntegrations, updateIntegration } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const integrations = await getIntegrations()
    return NextResponse.json({ success: true, data: integrations })
  } catch (err) {
    console.error('Fetch integrations error:', err)
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
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
      return NextResponse.json({ error: 'Integration ID is required' }, { status: 400 })
    }

    await updateIntegration(id, updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update integration error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update integration' }, { status: 500 })
  }
}
