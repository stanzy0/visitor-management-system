import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getScanHistory } from '@/lib/server/badge-scan'
import type { VerificationResult } from '@/lib/types/badge-scan'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Security', 'Receptionist'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)

    const filters = {
      badge_id: searchParams.get('badge_id') || undefined,
      qr_token: searchParams.get('qr_token') || undefined,
      verification_result: searchParams.get('verification_result') as VerificationResult | undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      scanner_name: searchParams.get('scanner_name') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    const result = await getScanHistory(filters)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Scan History] Error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
