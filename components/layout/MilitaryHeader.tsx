'use client'

import { useState, useEffect } from 'react'
import ImageWithFallback from '@/components/ui/ImageWithFallback'
import Link from 'next/link'
import { Menu, X, ShieldCheck } from 'lucide-react'

const NAV_LINKS = [
  { href: '/visitors/new', label: 'Register Visitor' },
  { href: '/login', label: 'Staff Login' },
]

export default function MilitaryHeader() {
  const [branding, setBranding] = useState<{
    logo_url: string | null
    department_logo_url: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
    college_name: string
  } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/branding')
      .then(res => res.ok ? res.json() : { data: null })
      .then(json => {
        if (cancelled || !json?.data) return
        setBranding({
          logo_url: json.data.logo_url,
          department_logo_url: json.data.department_logo_url,
          primary_color: json.data.primary_color || '#4B5320',
          secondary_color: json.data.secondary_color || '#556B2F',
          accent_color: json.data.accent_color || '#C8A646',
          college_name: json.data.college_name || 'Department of Land Warfare',
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const institutionLogo = branding?.logo_url || '/images/afcsc-logo.png'
  const armyLogo = '/images/army logo.png'

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(85,107,47,0.35)] bg-[#10150D]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 sm:gap-4 animate-vms-fade-in-left">
            <ImageWithFallback
              src={institutionLogo}
              alt="Armed Forces Command and Staff College Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
            />
            <div className="flex flex-col">
              <p className="text-sm sm:text-base font-bold uppercase tracking-widest text-[#F5F5DC] leading-tight">
                VMS
              </p>
            </div>
            <ImageWithFallback
              src={armyLogo}
              alt="Army Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
            />
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[#9A9F87] hover:text-[#C8A646] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <button
              className="md:hidden p-2 rounded-lg text-[#9A9F87] hover:bg-[#4B5320]/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C8A646]/40 to-transparent animate-vms-accent-line" />

      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(85,107,47,0.35)] bg-[#0B0F08] py-4 px-4">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#9A9F87] hover:text-[#C8A646] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="h-4 w-4 text-[#C8A646]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9F87]">
                System Ready
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-vms-subtle-pulse absolute inline-flex h-full w-full rounded-full bg-[#4B5320] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6B8E23]" />
              </span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
