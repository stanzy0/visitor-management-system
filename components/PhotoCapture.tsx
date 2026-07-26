'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, VideoOff } from 'lucide-react'
import { compressDataUrl, fileToDataUrl } from '@/lib/image/image-utils'

interface PhotoCaptureProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  error?: string
  required?: boolean
}

type Mode = 'idle' | 'camera' | 'preview'

export default function PhotoCapture({ value, onChange, error, required = true }: PhotoCaptureProps) {
  const [mode, setMode] = useState<Mode>(value ? 'preview' : 'idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraSupported, setCameraSupported] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!value) {
      setMode('idle')
    }
  }, [value])

  useEffect(() => {
    if (mode !== 'camera') return

    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream

    const handleLoadedMetadata = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return
      }
      setCameraReady(true)
    }

    const handlePlay = () => {
      setCameraReady(true)
    }

    video.onloadedmetadata = handleLoadedMetadata
    video.onplay = handlePlay

    const attemptPlay = async () => {
      try {
        await video.play()
      } catch {
        // play will be retried after metadata loads
      }
    }

    attemptPlay()

    if (video.readyState < 2) {
      retryTimerRef.current = setTimeout(async () => {
        try {
          await video.play()
        } catch {
          // ignore retry failure
        }
      }, 3000)
    }

    return () => {
      video.onloadedmetadata = null
      video.onplay = null
      video.srcObject = null
      video.load()
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [mode])

  const enumerateDevices = async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        return allDevices.filter(d => d.kind === 'videoinput')
      }
    } catch {
      // ignore enumeration failure
    }
    return []
  }

  const startCamera = async () => {
    setCameraError(null)
    setUploadError(null)
    setCameraReady(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      const videoDevices = await enumerateDevices()
      if (videoDevices.length === 0) {
        setCameraError('No camera found on this device.')
        setCameraSupported(false)
      } else {
        setCameraError('Camera not supported on this browser')
        setCameraSupported(false)
      }
      return
    }

    try {
      let stream: MediaStream
      const videoDevices = await enumerateDevices()

      if (videoDevices.length > 1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: 'environment' } },
            audio: false,
          })
        } catch {
          try {
            const backCamera = videoDevices.find(d => /back|rear|environment/i.test(d.label))
            if (backCamera) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: backCamera.deviceId } },
                audio: false,
              })
            } else {
              throw new Error('No back camera found')
            }
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            })
          }
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      streamRef.current = stream
      setMode('camera')
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Camera access was denied.')
          setCameraSupported(false)
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.')
          setCameraSupported(false)
        } else {
          setCameraError(err.message || 'Failed to access camera')
        }
      } else {
        setCameraError('Failed to access camera')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setMode('idle')
    setCameraError(null)
    setCameraReady(false)
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480

    canvas.width = width
    canvas.height = height
    ctx.drawImage(video, 0, 0, width, height)

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const compressed = await compressDataUrl(dataUrl)
      onChange(compressed)
      stopCamera()
      setMode('preview')
    } catch {
      setCameraError('Failed to capture photo')
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadError(null)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setUploadError(`Invalid file type: ${file.type || fileExtension}. Allowed: JPG, JPEG, PNG, HEIC`)
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB`)
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      const compressed = await compressDataUrl(dataUrl)
      onChange(compressed)
      setMode('preview')
    } catch {
      setUploadError('Failed to process image. Please try another file.')
    }
  }

  const removePhoto = () => {
    onChange(null)
    setMode('idle')
    setCameraError(null)
    setUploadError(null)
    setCameraReady(false)
  }

  const retakePhoto = async () => {
    setMode('idle')
    setCameraError(null)
    setUploadError(null)
    setCameraReady(false)
    await startCamera()
  }

  const replacePhoto = () => {
    setMode('idle')
    setCameraError(null)
    setUploadError(null)
    setCameraReady(false)
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (cameraError && !cameraSupported && mode !== 'camera') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <VideoOff className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900">Camera access was denied.</p>
            <p className="text-sm text-gray-600 mt-1">Please use the upload option below.</p>
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 min-h-[52px]"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            Upload Photo
          </button>
        </div>
        {uploadError && (
          <p className="text-sm text-red-600" role="alert">{uploadError}</p>
        )}
      </div>
    )
  }

  if (mode === 'camera') {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ width: '100%', height: 320 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-label="Camera preview"
            style={{ display: 'block' }}
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-sm text-gray-300">Starting camera...</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!cameraReady}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[52px]"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            Capture
          </button>
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 min-h-[52px]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            Cancel
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
    )
  }

  if (mode === 'preview' && value) {
    return (
      <div className="space-y-4">
        <div className="relative inline-block">
          <img
            src={value}
            alt="Visitor photo preview"
            className="h-48 w-48 md:h-64 md:w-64 rounded-xl object-cover border-2 border-gray-200"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retakePhoto}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 min-h-[52px]"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Retake Photo
          </button>
          <button
            type="button"
            onClick={replacePhoto}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 min-h-[52px]"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            Replace Photo
          </button>
          <button
            type="button"
            onClick={removePhoto}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-6 py-3 text-sm font-medium text-red-700 hover:bg-red-50 min-h-[52px]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            Remove Photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={startCamera}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Take Photo
        </button>
        <button
          type="button"
          onClick={triggerFileInput}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 min-h-[52px]"
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          Upload Photo
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      {cameraError && !cameraSupported && (
        <p className="text-sm text-amber-600" role="alert">{cameraError}</p>
      )}
      {uploadError && (
        <p className="text-sm text-red-600" role="alert">{uploadError}</p>
      )}
      {required && !value && !error && mode === 'idle' && (
        <p className="text-sm text-gray-500">A visitor photograph is required.</p>
      )}
    </div>
  )
}
