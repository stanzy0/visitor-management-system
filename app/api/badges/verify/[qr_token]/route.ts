import { NextRequest, NextResponse } from 'next/server'
import { verifyBadgeByQrToken, checkDuplicateScan, logScan } from '@/lib/server/badge-scan'

export async function GET(request: NextRequest, { params }: { params: Promise<{ qr_token: string }> }) {
  try {
    const { qr_token } = await params

    if (!qr_token) {
      return NextResponse.json({ valid: false, status: 'INVALID', message: 'QR token is required' }, { status: 400 })
    }

    const duplicateResult = await checkDuplicateScan(qr_token)
    if (duplicateResult.duplicate) {
      return NextResponse.json({
        valid: true,
        duplicate: true,
        status: 'VALID',
        message: 'Duplicate scan within 10 seconds',
        last_scanned_at: duplicateResult.lastScan?.scanned_at,
      })
    }

    const result = await verifyBadgeByQrToken({
      qr_token,
      scanner_name: request.headers.get('x-scanner-name') || undefined,
      device_name: request.headers.get('x-device-name') || undefined,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    })

    if (result.valid && result.status === 'VALID') {
      return NextResponse.json(result)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[Badge Verification] Error:', err)
    return NextResponse.json({ valid: false, status: 'INVALID', message: 'Internal server error' }, { status: 500 })
  }
}
