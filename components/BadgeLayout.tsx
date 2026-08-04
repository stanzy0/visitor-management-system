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
          className="absolute top-0 left-0 right-0 flex items-center justify-center rounded-t-xl"
          style={{ height: BADGE_LAYOUT.HEADER_HEIGHT, backgroundColor: primaryColor }}
        >
          <span className="text-white font-bold text-lg tracking-wider">{badgeHeaderText}</span>
        </div>

        <div
          className="absolute top-0 right-0 flex items-center justify-center"
          style={{ width: BADGE_LAYOUT.STATUS_BADGE_SIZE, height: BADGE_LAYOUT.STATUS_BADGE_SIZE }}
        >
          <div className={`px-2 py-1 rounded-b-lg text-white text-xs font-bold ${statusColors[badge.badge_status] || 'bg-gray-500'}`}>
            {badge.badge_status}
          </div>
        </div>

        {logoUrl && (
          <div className="absolute top-1 left-1 z-10">
            <Image src={logoUrl} alt="Logo" width={24} height={24} className="rounded object-contain bg-white/80 p-0.5" unoptimized />
          </div>
        )}

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

        <div className="flex gap-2" style={{ paddingTop: '6mm', paddingBottom: '5mm', paddingLeft: '2mm', paddingRight: '2mm', height: '100%' }}>
          <div className="flex flex-row items-start gap-2" style={{ flex: '1 1 60%' }}>
            <div className="flex-shrink-0">
              {showPhoto ? (
                <Image
                  src={badge.visit!.visitor!.photo_url as string}
                  alt={`${visitorName} photo`}
                  width={BADGE_LAYOUT.PHOTO_SIZE}
                  height={BADGE_LAYOUT.PHOTO_SIZE}
                  className="rounded object-cover border border-gray-200"
                  onError={handleImageError}
                  unoptimized
                />
              ) : (
                <div
                  className="rounded bg-gray-200 flex items-center justify-center border border-gray-200"
                  style={{ width: BADGE_LAYOUT.PHOTO_SIZE, height: BADGE_LAYOUT.PHOTO_SIZE }}
                  aria-hidden="true"
                >
                  <span className="text-2xl text-gray-500">{visitorInitial}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between min-w-0" style={{ gap: '2mm' }}>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {visitorName}
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {badge.visit?.visitor?.visitor_organization || '—'}
                </p>
              </div>

              <div className="space-y-1" style={{ fontSize: '5.5pt', lineHeight: '1.4' }}>
                <div className="flex">
                  <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Host:</span>
                  <span className="text-gray-900 font-medium truncate">{badge.visit?.employee?.full_name || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Dept:</span>
                  <span className="text-gray-900 truncate">{badge.visit?.employee?.department || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Purpose:</span>
                  <span className="text-gray-900 truncate">{badge.visit?.purpose || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 flex-shrink-0" style={{ width: '18mm' }}>Badge #:</span>
                  <span className="text-gray-900 font-mono font-bold" style={{ color: primaryColor }}>{badge.badge_number}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center" style={{ flex: '0 0 auto', gap: '1mm' }}>
            <QRCodeSVG
              value={qrValue}
              size={BADGE_QR_SETTINGS.SIZE}
              aria-label="Badge QR code"
            />
            <p className="text-gray-500 text-center leading-tight" style={{ fontSize: '5pt' }}>
              Scan for check-in/out and verification
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center border-t border-gray-200" style={{ padding: '1mm 2mm', fontSize: '5.5pt', bottom: '2mm' }}>
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
          <div className="absolute left-2" style={{ bottom: '6mm' }}>
            <Image src={signatureUrl} alt="Signature" width={50} height={16} className="object-contain opacity-80" unoptimized />
          </div>
        )}

        {stampUrl && (
          <div className="absolute right-2 z-10" style={{ bottom: '5mm' }}>
            <Image src={stampUrl} alt="Stamp" width={28} height={28} className="object-contain opacity-90" unoptimized />
          </div>
        )}
      </div>
    </div>
  )
})

export default BadgeLayout
