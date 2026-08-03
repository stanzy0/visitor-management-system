'use client'

import { useCallback, useState } from 'react'
import { Upload, Camera, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { validateDocumentFile, isImageMimeType } from '@/lib/types/document'
import type { VisitorDocument } from '@/lib/types/document'
import { createDocument } from '@/lib/client/documents'
import { logAuditAction } from '@/lib/client/audit'

interface DocumentUploadProps {
  visitorId: string
  onUploadComplete?: (document: VisitorDocument) => void
  disabled?: boolean
}

export default function DocumentUpload({ visitorId, onUploadComplete, disabled }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('National ID')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issuingCountry, setIssuingCountry] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleFile = (file: File) => {
    const validation = validateDocumentFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError(null)
    setSelectedFile(file)

    if (isImageMimeType(file.type)) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) handleFile(file)
        break
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !documentNumber) {
      setError('Please select a file and enter document number')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('visitor_id', visitorId)
      formData.append('document_type', documentType)
      formData.append('document_number', documentNumber)
      formData.append('issuing_country', issuingCountry || '')
      formData.append('expiry_date', expiryDate || '')
      formData.append('notes', notes || '')
      formData.append('file', selectedFile)

      const doc = await createDocument(formData)
      await logAuditAction('Document Uploaded', 'visitor_document', doc.id, `Document ${documentType} uploaded`)

      setSelectedFile(null)
      setPreview(null)
      setDocumentNumber('')
      setIssuingCountry('')
      setExpiryDate('')
      setNotes('')

      onUploadComplete?.(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="National ID">National ID</option>
          <option value="International Passport">International Passport</option>
          <option value="Driver&apos;s License">Driver&apos;s License</option>
          <option value="Military ID">Military ID</option>
          <option value="Staff ID">Staff ID</option>
          <option value="Invitation Letter">Invitation Letter</option>
          <option value="Approval Letter">Approval Letter</option>
          <option value="Vehicle Permit">Vehicle Permit</option>
          <option value="Security Clearance">Security Clearance</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
        <input
          type="text"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
          disabled={disabled}
          placeholder="Enter document number"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country</label>
          <input
            type="text"
            value={issuingCountry}
            onChange={(e) => setIssuingCountry(e.target.value)}
            disabled={disabled}
            placeholder="Enter country"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {preview && selectedFile && isImageMimeType(selectedFile.type) ? (
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  reset()
                }}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <FileText className="h-8 w-8" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  reset()
                }}
                className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Drag & drop, paste (Ctrl+V), browse, or use camera
              </p>
              <p className="text-xs text-gray-500">
                Images (JPG, PNG, WEBP) or PDF up to 10MB
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Additional notes"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={reset}
          disabled={disabled || uploading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={disabled || uploading || !selectedFile || !documentNumber}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          Upload Document
        </button>
      </div>
    </form>
  )
}
