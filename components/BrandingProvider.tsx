'use client'

import { useEffect } from 'react'
import { useBranding } from '@/hooks/useBranding'

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding()

  useEffect(() => {
    if (!branding) return
    const root = document.documentElement
    root.style.setProperty('--branding-primary', branding.primary_color)
    root.style.setProperty('--branding-secondary', branding.secondary_color)
    root.style.setProperty('--branding-accent', branding.accent_color)
  }, [branding])

  return <>{children}</>
}
