'use client'

import { useState } from 'react'
import { X, ZoomIn, ZoomOut, Download, FileText, Image as ImageIcon } from 'lucide-react'
import { VisitorDocument, isImageMimeType } from '@/lib/types/document'

interface DocumentPreviewProps {
  document: VisitorDocument
  onClose: () => void
  onReplace?: (file: File) => void
  onDelete?: () => void
  onVerify?: () => void
  onReject?: () => void
  showActions?: boolean
}

export default function DocumentPreview({
  document,
  onClose,
  onReplace,
  onDelete,
  onVerify,
  onReject,
  showActions = false,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1)
  const [fileUrl, setFileUrl] = useState(document.file_url)

  const handleDownload = async () => {
    if (!document.file_url) return
    const link = window.document.createElement('a')
    link.href = document.file_url
    link.download = document.file_name || 'document'
    link.click()
  }

  const isImage = fileUrl && isImageMimeType(document.mime_type)
  const isPdf = document.mime_type === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Document Preview</h3>
            <p className="text-sm text-gray-400">
              {document.document_type} - {document.document_number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </>
            )}
            {fileUrl && (
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-lg bg-gray-900 flex items-center justify-center">
          {isImage && fileUrl ? (
            <img
              src={fileUrl}
              alt={document.document_type}
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
              className="max-w-full max-h-full object-contain"
            />
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[500px]"
              title={`${document.document_type} preview`}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No preview available</p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Open file in new tab
                </a>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center justify-end gap-3 mt-4">
            {onReplace && (
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      onReplace(file)
                      setFileUrl(URL.createObjectURL(file))
                    }
                  }}
                />
              </label>
            )}
            {onVerify && (
              <button
                onClick={onVerify}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Verify
              </button>
            )}
            {onReject && (
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
