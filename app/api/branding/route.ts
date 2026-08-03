import { NextResponse, NextRequest } from 'next/server'
import { getBranding, updateBranding } from '@/lib/server/branding'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const branding = await getBranding()
    return NextResponse.json({ data: branding })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const branding = await updateBranding(body)
    return NextResponse.json({ data: branding })
  } catch {
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }
}
