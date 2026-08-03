'use client'

import { useEffect } from 'react'
import Image from 'next/image'
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
    height: 7mm !important;
    font-size: 3mm !important;
  }
  #printable-badge .badge-photo {
    width: 12mm !important;
    height: 12mm !important;
  }
  #printable-badge .badge-qr {
    width: 18mm !important;
    height: 18mm !important;
  }
  #printable-badge .badge-name {
    font-size: 2.8mm !important;
  }
  #printable-badge .badge-detail {
    font-size: 2mm !important;
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

export default function PrintableBadge({ badge, autoPrint = true, watermark }: PrintableBadgeProps) {
  const { branding } = useBranding()
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-badge-print', '')
    styleEl.textContent = PRINT_CSS
    document.head.appendChild(styleEl)

    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print()
        setTimeout(() => {
          window.close()
        }, 100)
      }, 300)

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
  }, [autoPrint])

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
            <Image src={logoUrl} alt="Logo" width={24} height={24} className="rounded object-contain bg-white/80 p-0.5" unoptimized />
          </div>
        )}

        <div
          className="badge-header absolute top-0 left-0 right-0 flex items-center justify-center text-white font-bold tracking-wider rounded-t"
          style={{ height: '7mm', fontSize: '3mm', backgroundColor: primaryColor }}
        >
          {badgeHeaderText}
        </div>

        <div
          className="absolute top-0 right-0 flex items-center justify-center text-white text-xs font-bold px-1 rounded-b"
          style={{ height: '8mm', fontSize: '1.8mm', backgroundColor: '#16a34a' }}
        >
          {badge.badge_status}
        </div>

        <div className="flex gap-1" style={{ paddingTop: '4mm', paddingBottom: '1mm', height: '100%' }}>
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="flex items-center gap-1">
              {showPhoto ? (
                <Image
                  src={showPhoto}
                  alt={`${visitorName} photo`}
                  width={96}
                  height={96}
                  className="badge-photo rounded object-cover border border-gray-200"
                  style={{ width: '12mm', height: '12mm' }}
                  unoptimized
                  quality={100}
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
              <div className="min-w-0">
                <p className="badge-name font-bold text-gray-900 truncate" style={{ fontSize: '2.8mm' }}>
                  {visitorName}
                </p>
                <p className="badge-detail text-gray-600 truncate" style={{ fontSize: '2mm' }}>
                  {badge.visit?.visitor?.visitor_organization || '—'}
                </p>
              </div>
            </div>

            <div className="space-y-0.5" style={{ fontSize: '2mm' }}>
              <div className="flex">
                <span className="text-gray-500" style={{ width: '14mm' }}>Host:</span>
                <span className="text-gray-900 font-medium truncate">{badge.visit?.employee?.full_name || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500" style={{ width: '14mm' }}>Dept:</span>
                <span className="text-gray-900 truncate">{badge.visit?.employee?.department || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500" style={{ width: '14mm' }}>Purpose:</span>
                <span className="text-gray-900 truncate">{badge.visit?.purpose || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500" style={{ width: '14mm' }}>Badge #:</span>
                <span className="text-gray-900 font-mono font-bold">{badge.badge_number}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-1">
            <QRCodeSVG
              value={qrValue}
              size={180}
              className="badge-qr"
              style={{ width: '18mm', height: '18mm' }}
              aria-label="Badge QR code"
            />
            <p className="badge-detail text-gray-500 text-center leading-tight" style={{ fontSize: '1.8mm' }}>
              Scan for check-in/out
              <br />
              and verification
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-gray-200" style={{ padding: '0.5mm 1.5mm', fontSize: '1.6mm' }}>
          <div>
            <span className="text-gray-500">Issued: </span>
            <span className="font-medium">
              {badge.issued_at ? new Date(badge.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Expires: </span>
            <span className="font-medium">
              {badge.expires_at ? new Date(badge.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </div>

        {signatureUrl && (
          <div className="absolute bottom-5 left-2">
            <Image src={signatureUrl} alt="Signature" width={50} height={16} className="object-contain opacity-80" unoptimized />
          </div>
        )}

        {stampUrl && (
          <div className="absolute bottom-3 right-2 z-10">
            <Image src={stampUrl} alt="Stamp" width={28} height={28} className="object-contain opacity-90" unoptimized />
          </div>
        )}
      </div>

      <p className="print-hint text-center mt-2 text-gray-400" style={{ fontSize: '2mm' }}>
        Print this badge at 100% scale. Disable browser headers and footers in print settings.
      </p>
    </div>
  )
}
