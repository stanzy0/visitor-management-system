import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyHistory } from '@/lib/server/property'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const history = await getPropertyHistory(id)
    return NextResponse.json({ success: true, data: history })
  } catch (err) {
    console.error('Fetch property history error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
