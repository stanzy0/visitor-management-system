'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  visitor_organization: string
  photo_url: string | null
}

interface Visit {
  id: string
  purpose: string
  status: string
  created_at: string
  qr_code: string | null
  employee: { full_name: string; department: string } | null
}

export default function BadgePage({ params }: { params: Promise<{ id: string }> }) {
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setVisitorId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!visitorId) return
    const fetchData = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const [{ data: vData }, { data: viData }] = await Promise.all([
        supabase.from('visitors').select('*').eq('id', visitorId).single(),
        supabase.from('visits').select('*, employee:employees(full_name, department)').eq('visitor_id', visitorId).order('created_at', { ascending: false }).limit(1)
      ])
      setVisitor(vData)
      setVisits(viData || [])
      setLoading(false)
    }
    fetchData()
  }, [visitorId])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const approvedVisit = visits.find(v => v.status === 'approved') || visits[0]

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        <div className="mb-6 print:hidden">
          <a href={`/visitors/${visitorId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Visitor
          </a>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 print:shadow-none print:rounded-none print:p-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-white font-bold text-xl">VMS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">VISITOR BADGE</h1>
          </div>
          <div className="flex flex-col items-center mb-6">
            {visitor?.photo_url ? (
              <img src={visitor.photo_url} alt={visitor.full_name} width={100} height={100} className="rounded-full object-cover mb-3" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                <span className="text-3xl text-gray-500">{visitor?.full_name?.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">{visitor?.full_name || '—'}</h2>
            <p className="text-gray-600">{visitor?.visitor_organization || '—'}</p>
          </div>
          <div className="space-y-3 text-sm border-t pt-4">
            <div className="flex justify-between"><span className="text-gray-500">Host:</span><span className="font-medium">{approvedVisit?.employee?.full_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="font-medium">{approvedVisit?.employee?.department || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purpose:</span><span className="font-medium">{approvedVisit?.purpose || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium">{approvedVisit?.created_at ? new Date(approvedVisit.created_at).toLocaleDateString() : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Badge #:</span><span className="font-mono font-medium">#{visitor?.id.slice(0, 8) || '—'}</span></div>
          </div>
          {approvedVisit?.qr_code && (
            <div className="flex justify-center mt-6">
              <img src={approvedVisit.qr_code} alt="QR Code" width={150} height={150} />
            </div>
          )}
          <div className="mt-6 print:hidden flex justify-center">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">Print Badge</button>
          </div>
        </div>
      </div>
    </div>
  )
}