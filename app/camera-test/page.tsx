'use client'

import { useState, useRef, useEffect } from 'react'

export default function CameraTestPage() {
  const [log, setLog] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`])
    console.log('[camera-test]', msg)
  }

  const startCamera = async () => {
    setLog([])
    try {
      addLog('startCamera called')
      
      if (!navigator.mediaDevices?.getUserMedia) {
        addLog('getUserMedia not supported')
        return
      }

      addLog('Requesting camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
      
      addLog(`Stream acquired: active=${stream.active}, id=${stream.id}`)
      
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        addLog(`Track: readyState=${videoTrack.readyState}, label=${videoTrack.label}, enabled=${videoTrack.enabled}`)
      }

      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        addLog('videoRef.current is null')
        return
      }

      addLog(`Video element found: clientWidth=${video.clientWidth}, clientHeight=${video.clientHeight}, offsetParent=${!!video.offsetParent}`)
      addLog(`Video instanceof HTMLVideoElement: ${video instanceof HTMLVideoElement}`)

      video.srcObject = stream
      addLog(`srcObject assigned: ${!!video.srcObject}`)

      video.onloadedmetadata = () => {
        addLog(`loadedmetadata: videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}, readyState=${video.readyState}`)
      }

      video.oncanplay = () => {
        addLog(`canplay: videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}`)
      }

      video.onplaying = () => {
        addLog(`playing: videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}, currentTime=${video.currentTime}`)
      }

      video.onerror = (e) => {
        addLog(`video error: ${e}`)
      }

      addLog('Calling video.play()...')
      await video.play()
      addLog(`play() resolved: paused=${video.paused}, currentTime=${video.currentTime}, videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}`)

      // Monitor every second
      const interval = setInterval(() => {
        const v = videoRef.current
        if (v) {
          addLog(`Monitor: currentTime=${v.currentTime}, videoWidth=${v.videoWidth}, videoHeight=${v.videoHeight}, readyState=${v.readyState}, paused=${v.paused}`)
        }
      }, 1000)

      setTimeout(() => clearInterval(interval), 15000)

    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
      console.error('[camera-test]', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    addLog('Camera stopped')
  }

  useEffect(() => {
    const enumerate = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(d => d.kind === 'videoinput')
          addLog(`Devices found: ${videoDevices.length}`)
          videoDevices.forEach((d, i) => {
            addLog(`Device ${i}: label=${d.label}, deviceId=${d.deviceId}`)
          })
        }
      } catch (err) {
        addLog(`enumerateDevices error: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
    enumerate()
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Camera Test Page</h1>
      
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={startCamera}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: 'white',
            cursor: 'pointer',
            minHeight: 52,
          }}
        >
          Start Camera
        </button>
        <button
          onClick={stopCamera}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#111827',
            cursor: 'pointer',
            minHeight: 52,
            marginLeft: 8,
          }}
        >
          Stop Camera
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: 'block',
            width: 640,
            height: 480,
            background: 'red',
            border: '3px solid red',
            objectFit: 'contain',
          }}
        />
      </div>

      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Logs</h2>
        <div style={{ maxHeight: 400, overflowY: 'auto', background: '#111827', color: '#10b981', padding: 12, borderRadius: 6, fontSize: 12 }}>
          {log.length === 0 && <div style={{ color: '#6b7280' }}>No logs yet. Click "Start Camera".</div>}
          {log.map((entry, i) => (
            <div key={i} style={{ marginBottom: 4 }}>{entry}</div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
        <p>User Agent: {navigator.userAgent}</p>
      </div>
    </div>
  )
}
