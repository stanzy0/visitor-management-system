'use client'

import { useEffect, useState } from 'react'
import PrintableBadge from '@/components/badges/PrintableBadge'
import type { VisitorBadge } from '@/lib/badge/badge-types'

export default function PreviewBadgeRoute() {
  const [badge, setBadge] = useState<VisitorBadge | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')
    if (key) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          setBadge(JSON.parse(data))
          localStorage.removeItem(key)
        } catch {
          // ignore parse error
        }
      }
    }
  }, [])

  if (!badge) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500">Preparing badge for printing...</div>
      </div>
    )
  }

  return <PrintableBadge badge={badge} autoPrint={false} />
}
