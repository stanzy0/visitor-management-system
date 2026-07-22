'use client'

import { useEffect, useState } from 'react'
import BadgeLayout from './BadgeLayout'
import type { VisitorBadge } from '@/lib/badge/badge-types'

const BADGE_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 15mm;
}
html,
body {
  width: 100%;
  height: 100%;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
body {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
@media print {
  body {
    padding: 0;
    overflow: hidden;
  }
}
`

interface PrintBadgePageProps {
  badge: VisitorBadge
}

export default function PrintBadgePage({ badge }: PrintBadgePageProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-badge-print', '')
    styleEl.textContent = BADGE_PRINT_CSS
    document.head.appendChild(styleEl)

    const timer = setTimeout(() => {
      setIsReady(true)
      setTimeout(() => {
        window.print()
        setTimeout(() => {
          window.close()
        }, 100)
      }, 300)
    }, 300)

    return () => {
      clearTimeout(timer)
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
    }
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500">Preparing badge for printing...</div>
      </div>
    )
  }

  const watermark = badge.badge_status === 'Expired' ? 'EXPIRED' : badge.badge_status === 'Cancelled' ? 'CANCELLED' : undefined

  return <BadgeLayout badge={badge} watermark={watermark} />
}
