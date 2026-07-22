'use client'

import { useState, useCallback, memo } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import type { VisitorBadge } from '@/lib/badge/badge-types'
import { BADGE_LAYOUT, BADGE_QR_SETTINGS, BADGE_STATUS } from '@/lib/badge/badge-constants'

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

  const qrValue = JSON.stringify({
    visitId: badge.visit_id,
    qrToken: badge.badge_number,
    type: BADGE_QR_SETTINGS.TYPE,
    issuedAt: badge.issued_at,
  })

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

  return (
    <div className="flex items-center justify-center" role="img" aria-label={`Visitor badge for ${visitorName}`}>
      <div
        id="visitor-badge-print-area"
        className="relative rounded-xl border-2 border-gray-300 bg-white p-6 w-full"
        style={{
          maxWidth: BADGE_LAYOUT.MAX_WIDTH,
          aspectRatio: BADGE_LAYOUT.ASPECT_RATIO,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center"
          style={{ height: BADGE_LAYOUT.HEADER_HEIGHT }}
        >
          <span className="text-white font-bold text-lg tracking-wider">VISITOR</span>
        </div>

        <div
          className="absolute top-0 right-0 flex items-center justify-center"
          style={{ width: BADGE_LAYOUT.STATUS_BADGE_SIZE, height: BADGE_LAYOUT.STATUS_BADGE_SIZE }}
        >
          <div className={`px-2 py-1 rounded-b-lg text-white text-xs font-bold ${statusColors[badge.badge_status] || 'bg-gray-500'}`}>
            {badge.badge_status}
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

        <div className="pt-12 pb-4 flex gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              {showPhoto ? (
                <Image
                  src={badge.visit!.visitor!.photo_url as string}
                  alt={`${visitorName} photo`}
                  width={BADGE_LAYOUT.PHOTO_SIZE}
                  height={BADGE_LAYOUT.PHOTO_SIZE}
                  className="rounded-lg object-cover border border-gray-200"
                  onError={handleImageError}
                  unoptimized
                />
              ) : (
                <div
                  className="rounded-lg bg-gray-200 flex items-center justify-center border border-gray-200"
                  style={{ width: BADGE_LAYOUT.PHOTO_SIZE, height: BADGE_LAYOUT.PHOTO_SIZE }}
                  aria-hidden="true"
                >
                  <span className="text-2xl text-gray-500">{visitorInitial}</span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {visitorName}
                </h3>
                <p className="text-sm text-gray-600">
                  {badge.visit?.visitor?.visitor_organization || '—'}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex">
                <span className="text-gray-500 w-32">Host:</span>
                <span className="text-gray-900 font-medium">{badge.visit?.employee?.full_name || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-32">Department:</span>
                <span className="text-gray-900">{badge.visit?.employee?.department || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-32">Purpose:</span>
                <span className="text-gray-900">{badge.visit?.purpose || '—'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-32">Badge #:</span>
                <span className="text-gray-900 font-mono font-bold">{badge.badge_number}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <QRCodeSVG
              value={qrValue}
              size={BADGE_QR_SETTINGS.SIZE}
              aria-label="Badge QR code"
            />
            <p className="text-xs text-gray-500 text-center">
              Scan for check-in/out
              <br />
              and verification
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-600">
          <div>
            <span className="text-gray-500">Issued:</span>{' '}
            <span className="font-medium">{formatDate(badge.issued_at)}</span>
          </div>
          <div>
            <span className="text-gray-500">Expires:</span>{' '}
            <span className="font-medium">{formatDate(badge.expires_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default BadgeLayout
