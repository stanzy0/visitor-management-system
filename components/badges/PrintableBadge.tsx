'use client'

import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { VisitorBadge } from '@/lib/badge/badge-types'
import { BADGE_QR_SETTINGS } from '@/lib/badge/badge-constants'
import { buildBadgeQrValue } from '@/lib/badge/badge-utils'
import { useBranding } from '@/hooks/useBranding'

const PRINT_CSS = `
@page {
  size: 85.60mm 53.98mm;
  margin: 0;
}
@media print {
  html, body {
    width: 85.60mm;
    height: 53.98mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body * {
    visibility: hidden;
  }
  #printable-badge,
  #printable-badge * {
    visibility: visible;
  }
  #printable-badge {
    position: absolute;
    left: 0;
    top: 0;
    width: 85.60mm;
    height: 53.98mm;
  }
  #printable-badge .badge-card {
    width: 85.60mm !important;
    height: 53.98mm !important;
    padding: 1.5mm !important;
    border-width: 0.3mm !important;
    box-sizing: border-box !important;
  }
  #printable-badge .badge-header {
    height: 9mm !important;
    font-size: 3mm !important;
    letter-spacing: 0.08em !important;
  }
  #printable-badge .badge-photo {
    width: 12mm !important;
    height: 12mm !important;
  }
  #printable-badge .badge-qr {
    width: 16mm !important;
    height: 16mm !important;
  }
  #printable-badge .badge-name {
    font-size: 3.2mm !important;
  }
  #printable-badge .badge-detail {
    font-size: 2.2mm !important;
  }
  #printable-badge .badge-logo {
    width: 8mm !important;
    height: 8mm !important;
  }
  #printable-badge .print-hint {
    display: none !important;
  }
}
`

interface PrintableBadgeProps {
  badge: VisitorBadge
  autoPrint?: boolean
  watermark?: string
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

export default function PrintableBadge({ badge, autoPrint = true, watermark }: PrintableBadgeProps) {
  const { branding } = useBranding()
  const printTriggeredRef = useRef(false)

  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-badge-print', '')
    styleEl.textContent = PRINT_CSS
    document.head.appendChild(styleEl)

    if (autoPrint && !printTriggeredRef.current) {
      printTriggeredRef.current = true

      const qrValue = buildBadgeQrValue(badge)
      const badgeWatermark =
        watermark ||
        (badge.badge_status === 'Expired'
          ? 'EXPIRED'
          : badge.badge_status === 'Cancelled'
            ? 'CANCELLED'
            : undefined)

      const primaryColor = branding?.primary_color || '#1e40af'
      const badgeHeaderText = branding?.badge_header_text || 'VISITOR'
      const badgeTemplateUrl = branding?.badge_template_url || null
      const logoUrl = branding?.logo_url || null
      const signatureUrl = branding?.signature_url || null
      const stampUrl = branding?.stamp_url || null

      const imageUrls = [
        badge.visit?.visitor?.photo_url,
        logoUrl,
        signatureUrl,
        stampUrl,
        badgeTemplateUrl,
      ].filter((url): url is string => Boolean(url))

      const loadImages = async () => {
        try {
          await Promise.all(imageUrls.map((url) => preloadImage(url)))
          await new Promise((resolve) => requestAnimationFrame(() => resolve(true)))
          window.print()
          setTimeout(() => {
            window.close()
          }, 100)
        } catch (error) {
          console.error('Badge print asset loading failed:', error)
          await new Promise((resolve) => requestAnimationFrame(() => resolve(true)))
          window.print()
          setTimeout(() => {
            window.close()
          }, 100)
        }
      }

      const timer = setTimeout(loadImages, 300)

      return () => {
        clearTimeout(timer)
        if (styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl)
        }
      }
    }

    return () => {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
    }
  }, [autoPrint, badge, watermark, branding])

  const qrValue = buildBadgeQrValue(badge)
  const visitorName = badge.visit?.visitor?.full_name || 'Visitor'
  const visitorInitial = visitorName.charAt(0).toUpperCase()
  const showPhoto = badge.visit?.visitor?.photo_url

  const badgeWatermark =
    watermark ||
    (badge.badge_status === 'Expired'
      ? 'EXPIRED'
      : badge.badge_status === 'Cancelled'
        ? 'CANCELLED'
        : undefined)

  const primaryColor = branding?.primary_color || '#1e40af'
  const badgeHeaderText = branding?.badge_header_text || 'VISITOR'
  const badgeTemplateUrl = branding?.badge_template_url || null
  const logoUrl = branding?.logo_url || null
  const signatureUrl = branding?.signature_url || null
  const stampUrl = branding?.stamp_url || null

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div id="printable-badge">
      <div
        className="badge-card relative bg-white border border-gray-300"
        style={{
          width: '85.60mm',
          height: '53.98mm',
          padding: '1.5mm',
          boxSizing: 'border-box',
          aspectRatio: '85.60 / 53.98',
          backgroundImage: badgeTemplateUrl ? `url(${badgeTemplateUrl})` : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
        {badgeWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden="true">
            <div
              className="font-bold text-red-600 whitespace-nowrap select-none"
              style={{
                fontSize: '8mm',
                opacity: 0.12,
                transform: 'rotate(-35deg)',
              }}
            >
              {badgeWatermark}
            </div>
          </div>
        )}

        {logoUrl && (
          <div className="absolute top-1 left-1 z-10">
            <img
              src={logoUrl}
              alt="Logo"
              width={32}
              height={32}
              className="badge-logo rounded object-contain bg-white/80 p-0.5"
              style={{ width: '8mm', height: '8mm' }}
            />
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '12mm 1fr 20mm',
            gridTemplateRows: '9mm 1fr 7mm',
            rowGap: '2mm',
            columnGap: '0.5mm',
            padding: '1.5mm',
            boxSizing: 'border-box',
            height: '100%',
          }}
        >
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              gridColumn: '1 / -1',
              gridRow: '1',
              backgroundColor: primaryColor,
              color: '#ffffff',
              fontSize: '3mm',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              paddingRight: '2mm',
              paddingLeft: '1mm',
              paddingTop: '2mm',
              position: 'relative',
            }}
          >
            <span className="truncate">{badgeHeaderText}</span>
            <span
              className="absolute text-white text-[1.8mm] font-bold px-2 py-1 rounded-b-md"
              style={{ right: 0, top: 0, backgroundColor: '#16a34a' }}
            >
              {badge.badge_status}
            </span>
          </div>

          <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', alignItems: 'start', justifyContent: 'center' }}>
            {showPhoto ? (
              <img
                src={showPhoto}
                alt={`${visitorName} photo`}
                width={96}
                height={96}
                className="badge-photo rounded object-cover border border-gray-200"
                style={{ width: '12mm', height: '12mm' }}
              />
            ) : (
              <div
                className="badge-photo rounded bg-gray-200 flex items-center justify-center border border-gray-200"
                style={{ width: '12mm', height: '12mm', fontSize: '6mm' }}
                aria-hidden="true"
              >
                {visitorInitial}
              </div>
            )}
          </div>

          <div style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column', minWidth: 0, paddingLeft: '1mm', paddingRight: '3mm' }}>
            <div className="min-w-0">
              <p className="badge-name font-bold text-gray-900 truncate" style={{ fontSize: '3.2mm', lineHeight: '1.2' }}>
                {visitorName}
              </p>
              <p className="badge-detail text-gray-600 truncate" style={{ fontSize: '2.2mm', lineHeight: '1.2' }}>
                {badge.visit?.visitor?.visitor_organization || '—'}
              </p>
            </div>

            <div style={{ fontSize: '5.5pt', lineHeight: '1.35', marginTop: '0.5mm' }}>
              <div className="flex" style={{ marginBottom: '0.8mm' }}>
                <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Host:</span>
                <span className="text-gray-900 font-medium truncate">{badge.visit?.employee?.full_name || '—'}</span>
              </div>
              <div className="flex" style={{ marginBottom: '0.8mm' }}>
                <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Dept:</span>
                <span className="text-gray-900 font-medium truncate">{badge.visit?.employee?.department || '—'}</span>
              </div>
              <div className="flex" style={{ marginBottom: '0.8mm' }}>
                <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Purpose:</span>
                <span className="text-gray-900 truncate">{badge.visit?.purpose || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Badge #:</span>
                <span className="font-mono font-bold truncate" style={{ color: primaryColor }}>{badge.badge_number}</span>
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2mm' }}>
            {(() => {
              const qrPayload = qrValue
              console.log({
                badge_id: badge.id,
                badge_number: badge.badge_number,
                qr_token: badge.qr_token,
                qr_payload: qrPayload,
              })
              return null
            })()}
            <QRCodeSVG
              value={qrValue}
              size={BADGE_QR_SETTINGS.SIZE}
              style={{ width: '16mm', height: '16mm' }}
              aria-label="Badge QR code"
            />
            <p className="text-gray-500 text-center leading-tight" style={{ fontSize: '5pt', lineHeight: '1.3' }}>
              Scan for<br />Check-in / Verification
            </p>
          </div>

          <div
            className="flex justify-between items-center"
            style={{
              gridColumn: '1 / -1',
              gridRow: '3',
              fontSize: '1.6mm',
              color: '#6b7280',
              paddingTop: '0.8mm',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <div>
              <span className="text-gray-500">Issued: </span>
              <span className="font-medium text-gray-900">
                {badge.issued_at ? formatDate(badge.issued_at) : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Expires: </span>
              <span className="font-medium text-gray-900">
                {badge.expires_at ? formatDate(badge.expires_at) : '—'}
              </span>
            </div>
          </div>
        </div>

        {signatureUrl && (
          <div className="absolute left-2" style={{ bottom: '5mm' }}>
            <img
              src={signatureUrl}
              alt="Signature"
              width={50}
              height={16}
              className="object-contain opacity-80"
            />
          </div>
        )}

        {stampUrl && (
          <div className="absolute right-2 z-10" style={{ bottom: '4mm' }}>
            <img
              src={stampUrl}
              alt="Stamp"
              width={28}
              height={28}
              className="object-contain opacity-90"
            />
          </div>
        )}
      </div>

      <p className="print-hint text-center mt-2 text-gray-400" style={{ fontSize: '2mm' }}>
        Print this badge at 100% scale. Disable browser headers and footers in print settings.
      </p>
    </div>
  )
}
