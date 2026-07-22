'use client'

import { useState } from 'react'
import { X, CheckCircle, XCircle } from 'lucide-react'
import { VerificationStatus } from '@/lib/types/document'
import { verifyDocument, rejectDocument } from '@/lib/client/documents'
import { logAuditAction } from '@/lib/client/audit'
import { VisitorDocument } from '@/lib/types/document'

interface DocumentVerificationModalProps {
  document: VisitorDocument
  onClose: () => void
  onVerified: (doc: VisitorDocument) => void
  onRejected: (doc: VisitorDocument) => void
}

export default function DocumentVerificationModal({
  document,
  onClose,
  onVerified,
  onRejected,
}: DocumentVerificationModalProps) {
  const [status, setStatus] = useState<VerificationStatus>('Verified')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (status === 'Verified') {
        const doc = await verifyDocument(document.id, notes || undefined)
        await logAuditAction('Document Verified', 'visitor_document', document.id, `Document ${document.id} verified`)
        onVerified(doc)
      } else {
        const doc = await rejectDocument(document.id, notes || undefined)
        await logAuditAction('Document Rejected', 'visitor_document', document.id, `Document ${document.id} rejected`)
        onRejected(doc)
      }
      onClose()
    } catch {
      // handled by caller
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Verify Document</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStatus('Verified')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                status === 'Verified'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Verify</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus('Rejected')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                status === 'Rejected'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Reject</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={status === 'Verified' ? 'Verification notes (optional)' : 'Reason for rejection'}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                status === 'Verified'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {status === 'Verified' ? 'Verify' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
