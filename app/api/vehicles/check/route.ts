import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, PERMISSIONS } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'check') {
    const registrationNumber = searchParams.get('reg')
    
    if (!registrationNumber) {
      return NextResponse.json({ error: 'Registration number required' }, { status: 400 })
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization),
        employee:employees(full_name, department, office_location)
      `)
      .eq('registration_number', registrationNumber)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json({ vehicle })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}