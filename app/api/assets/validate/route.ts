import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyItemByQR } from '@/lib/server/property'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security', 'Host Employee'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const qr = searchParams.get('qr')

    if (!qr) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const item = await getPropertyItemByQR(qr)

    if (!item) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: item })
  } catch (err) {
    console.error('Validate property QR error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
