'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { Loader2, ArrowLeft, QrCode, FileText, Printer, ShieldAlert, History } from 'lucide-react'
import type { PropertyItem, PropertyHistoryRecord } from '@/lib/types/property'

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<PropertyItem | null>(null)
  const [history, setHistory] = useState<PropertyHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      fetchItem()
      fetchHistory()
    }
    checkAuth()
  }, [params.id])

  useEffect(() => {
    const channel = supabase
      .channel(`property-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_items', filter: `id=eq.${params.id}` }, () => fetchItem())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/assets/${params.id}`)
      const json = await res.json()
      if (json.success) {
        setItem(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch property item:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/assets/${params.id}/history`)
      const json = await res.json()
      if (json.success) {
        setHistory(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Item Not Found</h2>
          <button onClick={() => window.location.href = '/assets'} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Assets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <button onClick={() => window.location.href = '/assets'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600 mt-1">Property #{item.property_number}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            item.status === 'Inside' ? 'bg-green-100 text-green-800' :
            item.status === 'Confiscated' ? 'bg-red-100 text-red-800' :
            item.status === 'Released' ? 'bg-blue-100 text-blue-800' :
            item.status === 'Lost' ? 'bg-orange-100 text-orange-800' :
            item.status === 'Damaged' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {item.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Item Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium">{item.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Brand</span>
                  <span className="font-medium">{item.brand || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Model</span>
                  <span className="font-medium">{item.model || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Serial Number</span>
                  <span className="font-medium">{item.serial_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Color</span>
                  <span className="font-medium">{item.color || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Condition</span>
                  <span className="font-medium">{item.condition}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Visitor & Host</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Visitor</span>
                  <span className="font-medium">{item.visitor?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Organization</span>
                  <span className="font-medium">{item.visitor?.visitor_organization || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Host Employee</span>
                  <span className="font-medium">{item.employee?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Department</span>
                  <span className="font-medium">{item.employee?.department || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Status & Tracking</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Current Status</span>
                  <span className="font-medium">{item.status}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Registered At</span>
                  <span className="font-medium">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                {item.confiscated && (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Confiscated At</span>
                      <span className="font-medium">{new Date(item.confiscated_at!).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Confiscated By</span>
                      <span className="font-medium">{item.confiscated_by || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Reason</span>
                      <span className="font-medium">{item.confiscated_reason || 'N/A'}</span>
                    </div>
                  </>
                )}
                {item.released_at && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Released At</span>
                    <span className="font-medium">{new Date(item.released_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {item.photo_url && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Photo</h3>
                <img src={item.photo_url} alt={item.name} className="w-full max-w-xs rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2">
            <QrCode className="h-4 w-4" />
            View QR
          </button>
          <button className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
          <button className="flex-1 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            View Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <History className="h-5 w-5" />
          History
        </h2>
        {history.length === 0 ? (
          <p className="text-gray-500">No history available</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{record.action}</p>
                  <p className="text-sm text-gray-600">{record.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(record.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
