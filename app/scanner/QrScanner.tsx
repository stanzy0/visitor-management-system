'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Loader2, Camera, StopCircle, RefreshCw, QrCode } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'

interface VisitData {
  id: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  visitor: { full_name: string; company: string; photo_url: string | null } | null
  employee: { full_name: string; department: string } | null
}

export default function QrScanner() {
  const [authChecking, setAuthChecking] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<VisitData | null>(null)
  const [scanned, setScanned] = useState(false)
  const [cameras, setCameras] = useState<string[]>([])
  const [currentCamera, setCurrentCamera] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('scanner')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!scanning) {
      if (scannerRef.current) {
        void scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
      return
    }

    const initScanner = async () => {
      const element = document.getElementById('qr-reader')
      if (!element || scannerRef.current) return

      scannerRef.current = new Html5Qrcode('qr-reader')

      try {
        const devices = await Html5Qrcode.getCameras()
        const cameraIds = devices.map(d => d.id)
        setCameras(cameraIds)

        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => handleScan(decodedText),
          () => {}
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowed')) {
          setError('Camera permission denied. Please allow camera access.')
        } else if (errorMsg.includes('No camera')) {
          setError('No camera available.')
        } else {
          setError('Failed to start scanner: ' + errorMsg)
        }
        scannerRef.current = null
      }
    }

    const timer = setTimeout(initScanner, 100)
    return () => clearTimeout(timer)
  }, [scanning])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        void scannerRef.current.stop()
        scannerRef.current.clear()
      }
    }
  }, [])

  const startScanner = () => {
    if (scanning) return
    setError(null)
    setScanned(false)
    setScanResult(null)
    setScanning(true)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Stop error:', err)
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const switchCamera = async () => {
    if (cameras.length < 2 || !scannerRef.current) return

    try {
      const nextCamera = (currentCamera + 1) % cameras.length
      await stopScanner()
      setCurrentCamera(nextCamera)
      setScanning(true)
    } catch (err) {
      console.error('Switch camera error:', err)
    }
  }

  const handleScan = async (decodedText: string) => {
    try {
      const payload = JSON.parse(decodedText)
      if (payload.type !== 'visitor-pass' || !payload.visitId) {
        setError('Invalid QR Code')
        return
      }

      const { data, error } = await supabase
        .from('visits')
        .select('*, visitor:visitors(full_name, company, photo_url), employee:employees(full_name, department)')
        .eq('id', payload.visitId)
        .single()

      if (error || !data) {
        setError('Visit not found')
        return
      }

      const visitData = data as VisitData
      setScanResult(visitData)
      await stopScanner()

      logAuditAction('QR Code Scanned', 'visit', visitData.id, `QR scanned for visitor ${visitData.visitor?.full_name}`)

      if (visitData.status === 'approved') {
        const { error: updateError } = await supabase
          .from('visits')
          .update({ status: 'checked_in', check_in_time: new Date().toISOString() })
          .eq('id', visitData.id)

        if (!updateError) {
          logAuditAction('Visitor Checked In', 'visit', visitData.id, `${visitData.visitor?.full_name} checked in`)
          setScanResult({ ...visitData, status: 'checked_in', check_in_time: new Date().toISOString() })
          setNotification({ type: 'success', message: 'Visitor Checked In Successfully' })
        }
      }

      setScanned(true)
    } catch {
      setError('Invalid QR Code')
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const getStatusMessage = () => {
    if (!scanResult) return null

    switch (scanResult.status) {
      case 'pending':
        return <p className="text-amber-600 font-medium">Visit has not been approved.</p>
      case 'rejected':
        return <p className="text-red-600 font-medium">Visit was rejected.</p>
      case 'checked_out':
        return <p className="text-gray-600 font-medium">Visitor already checked out.</p>
      case 'checked_in':
        return <p className="text-green-600 font-medium">Already checked in at {scanResult.check_in_time ? new Date(scanResult.check_in_time).toLocaleTimeString() : '—'}</p>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
          <p className="text-gray-600">Scan a visitor badge to check visitors in.</p>
        </div>

        {notification && (
          <div className={`rounded-lg p-4 text-center text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!scanned ? (
          <div className="flex justify-center gap-4">
            <button onClick={startScanner} disabled={scanning} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Camera className="h-4 w-4" />
              Start Scanner
            </button>
            {scanning && (
              <button onClick={stopScanner} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <StopCircle className="h-4 w-4" />
                Stop Scanner
              </button>
            )}
            {scanning && cameras.length > 1 && (
              <button onClick={switchCamera} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <RefreshCw className="h-4 w-4" />
                Switch Camera
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => { setScanned(false); setScanResult(null) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 mx-auto">
            <QrCode className="h-4 w-4" />
            Scan Next Visitor
          </button>
        )}

        {scanning && (
          <div className="flex justify-center">
            <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden border" />
          </div>
        )}

        {scanResult && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 max-w-md mx-auto">
            <div className="flex flex-col items-center">
              {scanResult.visitor?.photo_url ? (
                <img src={scanResult.visitor.photo_url} alt={scanResult.visitor.full_name || ''} width={80} height={80} className="h-20 w-20 rounded-full object-cover mb-4" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <span className="text-2xl text-gray-500">{(scanResult.visitor?.full_name || '').charAt(0).toUpperCase()}</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{scanResult.visitor?.full_name || '—'}</h2>
              <p className="text-gray-600">{scanResult.visitor?.company || '—'}</p>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div><span className="text-gray-500">Host:</span><span className="ml-2 text-gray-900">{scanResult.employee?.full_name || '—'}</span></div>
              <div><span className="text-gray-500">Department:</span><span className="ml-2 text-gray-900">{scanResult.employee?.department || '—'}</span></div>
              <div><span className="text-gray-500">Purpose:</span><span className="ml-2 text-gray-900">{scanResult.purpose || '—'}</span></div>
              <div><span className="text-gray-500">Status:</span><span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{scanResult.status.replace('_', ' ')}</span></div>
              <div><span className="text-gray-500">Check-in Time:</span><span className="ml-2 text-gray-900">{scanResult.check_in_time ? new Date(scanResult.check_in_time).toLocaleString() : '—'}</span></div>
              <div><span className="text-gray-500">Badge #:</span><span className="ml-2 font-mono text-gray-900">#{scanResult.id.slice(0, 8)}</span></div>
            </div>

            <div className="mt-4">{getStatusMessage()}</div>
          </div>
        )}
      </div>
    </div>
  )
}