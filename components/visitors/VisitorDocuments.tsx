'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Eye, Download, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { VisitorDocument } from '@/lib/types/document'
import DocumentPreview from '@/components/documents/DocumentPreview'
import { formatFileSize } from '@/lib/types/document'

interface VisitorDocumentsProps {
  documents: VisitorDocument[]
  loading?: boolean
}

export default function VisitorDocuments({ documents, loading }: VisitorDocumentsProps) {
  const [previewDoc, setPreviewDoc] = useState<VisitorDocument | null>(null)

  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <p className="text-sm text-gray-500 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
      </div>
      <div className="overflow-x-auto">
        {documents.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Number</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{doc.document_type}</td>
                  <td className="px-5 py-3 text-gray-600 font-mono">{doc.document_number || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                      doc.verification_status === 'Verified'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : doc.verification_status === 'Rejected'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {doc.verification_status === 'Verified' && <CheckCircle className="h-3 w-3" />}
                      {doc.verification_status === 'Rejected' && <XCircle className="h-3 w-3" />}
                      {doc.verification_status === 'Pending' && <Clock className="h-3 w-3" />}
                      {doc.verification_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {doc.file_name ? formatFileSize(doc.file_size) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      {doc.file_url ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </motion.button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents uploaded</p>
            <p className="text-xs text-gray-400 mt-1">Documents will appear here once uploaded</p>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreview
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          showActions={false}
        />
      )}
    </motion.div>
  )
}
