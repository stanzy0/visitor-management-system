import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { registration_number, reason, officer } = await req.json()

  if (!registration_number) {
    return NextResponse.json({ error: 'Registration number required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('vehicle_blacklist')
    .insert({ registration_number, reason, officer })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, data })
}