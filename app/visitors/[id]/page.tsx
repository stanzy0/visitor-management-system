'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { generateVisitQRCode } from '@/lib/qrcode'
import { Loader2, QrCode, Printer, Edit, ArrowLeft } from 'lucide-react'

interface Visitor {
  id: string
  full_name: string
  email: string
  phone: string
  company: string
  photo_url: string | null
  created_at: string
}

interface Visit {
  id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  qr_code: string | null
  employee: { full_name: string; department: string } | null
}

interface AuditLog {
  id: string
  action: string
  details: string
  performed_by: string
  created_at: string
}

export default function VisitorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [generatingQR, setGeneratingQR] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setVisitorId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!visitorId) return

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      await fetchVisitor()
      await fetchVisits()
    }
    checkAuth()
  }, [visitorId])

  useEffect(() => {
    if (!authChecking && visitorId && visits.length >= 0) {
      fetchAuditLogs()
    }
  }, [visits, visitorId])

  const fetchVisitor = async () => {
    if (!visitorId) return
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single()

    if (error) {
      console.error('Error fetching visitor:', error)
    } else {
      setVisitor(data)
    }
  }

  const fetchVisits = async () => {
    if (!visitorId) return
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        employee:employees(full_name, department)
      `)
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching visits:', error)
    } else {
      setVisits(data || [])
    }
  }

  const handleGenerateQRCode = async (visitId: string) => {
    setGeneratingQR(visitId)
    try {
      const qrCode = await generateVisitQRCode(visitId)
      const { error } = await supabase
        .from('visits')
        .update({ qr_code: qrCode })
        .eq('id', visitId)

      if (error) {
        console.error('Error saving QR code:', error)
      } else {
        await fetchVisits()
        logAuditAction('QR Code Generated', 'visit', visitId, `QR code generated for visitor ${visitor?.full_name}`)
      }
    } catch (err) {
      console.error('Error generating QR code:', err)
    } finally {
      setGeneratingQR(null)
    }
  }

  const fetchAuditLogs = async () => {
    if (!visitorId) return
    const visitIds = visits.map((v) => v.id)

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', visitorId)
      .eq('entity_type', 'visitor')
      .order('created_at', { ascending: false })

    if (visitIds.length > 0) {
      const { data: visitLogs, error: visitError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('entity_id', visitIds)
        .eq('entity_type', 'visit')
        .order('created_at', { ascending: false })

      if (visitError) {
        console.error('Error fetching visit audit logs:', visitError)
        setAuditLogs([])
        return
      }

      const { data: visitorLogs, error: visitorError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', visitorId)
        .eq('entity_type', 'visitor')
        .order('created_at', { ascending: false })

      if (!visitorError) {
        const combined = [...(visitorLogs || []), ...(visitLogs || [])].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setAuditLogs(combined)
      }
      return
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
    } else {
      setAuditLogs(data || [])
    }
  }

  if (authChecking || !visitorId) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6">
            <a href="/visitors" className="text-sm text-blue-600 hover:underline">
              ← Back to Visitors
            </a>
          </div>
          <p className="text-gray-500">Visitor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/visitors" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Visitors
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Visitor Details</h1>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <Edit className="h-4 w-4" />
              Edit Visitor
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Printer className="h-4 w-4" />
              Print Badge
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <QrCode className="h-4 w-4" />
              QR Code
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex flex-col items-center">
                {visitor.photo_url ? (
                  <img
                    src={visitor.photo_url}
                    alt={visitor.full_name}
                    className="h-32 w-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <span className="text-3xl text-gray-500">
                      {visitor.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">{visitor.full_name}</h2>
                <p className="text-gray-600">{visitor.company || '—'}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="text-sm text-gray-900">{visitor.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Phone</p>
                  <p className="text-sm text-gray-900">{visitor.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Company</p>
                  <p className="text-sm text-gray-900">{visitor.company || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Visitor Type</p>
                  <p className="text-sm text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">ID Type</p>
                  <p className="text-sm text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Registered Date</p>
                  <p className="text-sm text-gray-900">
                    {visitor.created_at ? new Date(visitor.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Visit History</h3>
              </div>
              <div className="overflow-x-auto">
                {visits.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 w-32">QR Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visits.map((visit) => (
                        <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{visit.status.replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            {visit.qr_code ? (
                              <div className="flex flex-col items-center">
                                <img
                                  src={visit.qr_code}
                                  alt="Visitor QR Code"
                                  width={160}
                                  height={160}
                                  className="rounded-lg border"
                                />
                                <span className="text-xs text-gray-500 mt-1">#{visit.id.slice(0, 8)}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateQRCode(visit.id)}
                                disabled={generatingQR === visit.id}
                                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {generatingQR === visit.id ? 'Generating...' : 'Generate QR'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No visit records found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Audit History</h3>
              </div>
              <div className="overflow-x-auto">
                {auditLogs.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Details</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Performed By</th>
                        <th className="px-4 py-3 font-semibold text-gray-700">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                          <td className="px-4 py-3 text-gray-600">{log.details || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{log.performed_by}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No audit records found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}