import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status as number })
  }

  const configured = !!process.env.RESEND_API_KEY
  return NextResponse.json({ configured })
}
