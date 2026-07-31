import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    test: 'Environment variables test'
  })
}