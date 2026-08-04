'use client'

import { useState, useCallback, memo } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import type { VisitorBadge } from '@/lib/badge/badge-types'
import { BADGE_LAYOUT, BADGE_QR_SETTINGS, BADGE_STATUS } from '@/lib/badge/badge-constants'
import { buildBadgeQrValue } from '@/lib/badge/badge-utils'
import { useBranding } from '@/hooks/useBranding'

interface BadgeLayoutProps {
  badge: VisitorBadge
  watermark?: string
}

const statusColors: Record<string, string> = {
  [BADGE_STATUS.ACTIVE]: 'bg-green-500',
  [BADGE_STATUS.EXPIRED]: 'bg-red-500',
  [BADGE_STATUS.CHECKED_OUT]: 'bg-gray-500',
  [BADGE_STATUS.CANCELLED]: 'bg-red-700',
}

const isDev = process.env.NODE_ENV === 'development'

export const BadgeLayout = memo(function BadgeLayout({ badge, watermark }: BadgeLayoutProps) {
  const [imageError, setImageError] = useState(false)
  const { branding } = useBranding()

  const qrValue = buildBadgeQrValue(badge)

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  const showPhoto = badge.visit?.visitor?.photo_url && !imageError

  const handleImageError = useCallback(() => {
    const url = badge.visit?.visitor?.photo_url
    if (isDev) {
      console.error('Visitor photo failed to load:', { url, reason: 'Image load error' })
    }
    setImageError(true)
  }, [badge.visit?.visitor?.photo_url])

  const visitorName = badge.visit?.visitor?.full_name || 'Visitor'
  const visitorInitial = visitorName.charAt(0).toUpperCase()

  const primaryColor = branding?.primary_color || '#1e40af'
  const badgeHeaderText = branding?.badge_header_text || 'VISITOR'
  const badgeTemplateUrl = branding?.badge_template_url || null
  const logoUrl = branding?.logo_url || null
  const signatureUrl = branding?.signature_url || null
  const stampUrl = branding?.stamp_url || null

  return (
    <div className="flex items-center justify-center" role="img" aria-label={`Visitor badge for ${visitorName}`}>
      <div
        id="visitor-badge-print-area"
        className="relative rounded-xl border-2 bg-white w-full"
        style={{
          maxWidth: BADGE_LAYOUT.MAX_WIDTH,
          aspectRatio: BADGE_LAYOUT.ASPECT_RATIO,
          borderColor: '#e5e7eb',
          backgroundImage: badgeTemplateUrl ? `url(${badgeTemplateUrl})` : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
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
            style={{
              gridColumn: '1 / -1',
              gridRow: '1',
              display: 'grid',
              gridTemplateColumns: '10mm 1fr auto',
              alignItems: 'center',
              backgroundColor: primaryColor,
              color: '#ffffff',
              paddingLeft: '2mm',
              paddingRight: '2mm',
              height: '9mm',
              borderRadius: '0.375rem',
            }}
          >
            <div style={{ gridColumn: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="badge-logo rounded object-contain bg-white/80 p-0.5"
                  style={{ width: '8mm', height: '8mm', maxWidth: '8mm', maxHeight: '8mm' }}
                  unoptimized
                />
              )}
            </div>
            <div style={{ gridColumn: '2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="truncate" style={{ fontSize: '3mm', fontWeight: 'bold', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                {badgeHeaderText}
              </span>
            </div>
            <div style={{ gridColumn: '3', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: '2mm' }}>
              <span className="text-white font-bold rounded-b-md" style={{ fontSize: '1.8mm', padding: '0.5mm 1mm', backgroundColor: '#16a34a', whiteSpace: 'nowrap' }}>
                {badge.badge_status}
              </span>
            </div>
          </div>

          <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', alignItems: 'start', justifyContent: 'center' }}>
            {showPhoto ? (
              <Image
                src={badge.visit!.visitor!.photo_url as string}
                alt={`${visitorName} photo`}
                width={BADGE_LAYOUT.PHOTO_SIZE}
                height={BADGE_LAYOUT.PHOTO_SIZE}
                className="rounded object-cover border border-gray-200"
                style={{ width: '12mm', height: '12mm' }}
                onError={handleImageError}
                unoptimized
              />
            ) : (
              <div
                className="rounded bg-gray-200 flex items-center justify-center border border-gray-200"
                style={{ width: '12mm', height: '12mm' }}
                aria-hidden="true"
              >
                <span className="text-2xl text-gray-500">{visitorInitial}</span>
              </div>
            )}
          </div>

          <div style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column', minWidth: 0, paddingLeft: '1mm', paddingRight: '3mm' }}>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate" style={{ fontSize: '3.2mm', lineHeight: '1.2' }}>
                {visitorName}
              </h3>
              <p className="text-gray-600 truncate" style={{ fontSize: '2.2mm', lineHeight: '1.2' }}>
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

        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden="true">
            <div
              className="font-bold text-red-600 whitespace-nowrap select-none"
              style={{
                fontSize: BADGE_LAYOUT.WATERMARK_FONT_SIZE,
                opacity: BADGE_LAYOUT.WATERMARK_OPACITY,
                transform: `rotate(${BADGE_LAYOUT.WATERMARK_ROTATION}deg)`,
              }}
            >
              {watermark}
            </div>
          </div>
        )}

        {signatureUrl && (
          <div className="absolute left-2" style={{ bottom: '5mm' }}>
            <Image src={signatureUrl} alt="Signature" width={50} height={16} className="object-contain opacity-80" unoptimized />
          </div>
        )}

        {stampUrl && (
          <div className="absolute right-2 z-10" style={{ bottom: '4mm' }}>
            <Image src={stampUrl} alt="Stamp" width={28} height={28} className="object-contain opacity-90" unoptimized />
          </div>
        )}
      </div>
    </div>
  )
})

export default BadgeLayout
