'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import type { BadgePreviewVisit, BadgeTemplateOption } from '@/lib/types/badge-preview'
import BadgePreviewPanel from '@/components/badges/BadgePreviewPanel'

export default function BadgePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const visitId = params.visitId as string

  const [visit, setVisit] = useState<BadgePreviewVisit | null>(null)
  const [templates, setTemplates] = useState<BadgeTemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPreviewData()
  }, [visitId])

  const fetchPreviewData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reception/badge-preview/${encodeURIComponent(visitId)}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to load badge preview')
        setLoading(false)
        return
      }

      setVisit(json.data.visit)
      setTemplates(json.data.templates || [])
      setError(null)
    } catch {
      setError('Failed to load badge preview')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reception/badge-preview/${encodeURIComponent(visitId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to approve registration')
        setSaving(false)
        return
      }

      router.push('/visits')
    } catch {
      setError('Failed to approve registration')
      setSaving(false)
    }
  }

  const handleReject = async (reason: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reception/badge-preview/${encodeURIComponent(visitId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to reject registration')
        setSaving(false)
        return
      }

      router.push('/visits')
    } catch {
      setError('Failed to reject registration')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleEdit = () => {
    router.push(`/visitors/new?visitId=${visitId}`)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600">{error || 'Registration not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BadgePreviewPanel
      visit={visit}
      templates={templates}
      onApprove={handleApprove}
      onReject={handleReject}
      onCancel={handleCancel}
      onEdit={handleEdit}
      saving={saving}
    />
  )
}
