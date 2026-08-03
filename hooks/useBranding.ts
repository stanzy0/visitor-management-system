import { useState, useEffect, useCallback } from 'react'

let cachedBranding: {
  logo_url: string | null
  login_background_url: string | null
  badge_template_url: string | null
  signature_url: string | null
  stamp_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  badge_header_text: string
  badge_footer_text: string | null
  college_name: string
} | null = null

export function useBranding() {
  const [branding, setBranding] = useState(cachedBranding)
  const [loading, setLoading] = useState(!cachedBranding)

  useEffect(() => {
    if (cachedBranding) {
      setBranding(cachedBranding)
      setLoading(false)
      return
    }

    let cancelled = false

    fetch('/api/branding')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(({ data }) => {
        if (cancelled) return
        cachedBranding = {
          logo_url: data.logo_url,
          login_background_url: data.login_background_url,
          badge_template_url: data.badge_template_url,
          signature_url: data.signature_url,
          stamp_url: data.stamp_url,
          primary_color: data.primary_color || '#0B3D91',
          secondary_color: data.secondary_color || '#1F6FEB',
          accent_color: data.accent_color || '#D4AF37',
          badge_header_text: data.badge_header_text || 'VISITOR',
          badge_footer_text: data.badge_footer_text || null,
          college_name: data.college_name || 'AFCSC Visitor Management',
        }
        setBranding(cachedBranding)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    cachedBranding = null
    setLoading(true)
  }, [])

  return { branding, loading, refresh }
}
