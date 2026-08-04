'use client'

import { useEffect, useState } from 'react'
import PrintableBadge from '@/components/badges/PrintableBadge'
import type { VisitorBadge } from '@/lib/badge/badge-types'
import type { BrandingSettings } from '@/lib/types/branding'

export default function PreviewBadgeRoute() {
  const [badge, setBadge] = useState<VisitorBadge | null>(null)
  const [branding, setBranding] = useState<BrandingSettings | null>(null)

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

    fetch('/api/branding')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(({ data }) => setBranding(data))
      .catch(() => {
        // branding failed to load, preview will render without branding assets
      })
  }, [])

  if (!badge) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500">Preparing badge for printing...</div>
      </div>
    )
  }

  return <PrintableBadge badge={badge} branding={branding || {
    id: '00000000-0000-0000-0000-000000000000',
    college_name: 'AFCSC Visitor Management',
    logo_url: null,
    login_background_url: null,
    badge_template_url: null,
    signature_url: null,
    stamp_url: null,
    primary_color: '#0B3D91',
    secondary_color: '#1F6FEB',
    accent_color: '#D4AF37',
    badge_header_text: 'VISITOR',
    badge_footer_text: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }} autoPrint={false} />
}
