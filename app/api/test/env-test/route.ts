import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    test: 'Environment variables test'
  })
}