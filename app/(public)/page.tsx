'use client'

import { useState, useEffect } from 'react'
import ImageWithFallback from '@/components/ui/ImageWithFallback'
import MilitaryHeader from '@/components/layout/MilitaryHeader'
import Link from 'next/link'
import {
  ShieldCheck,
  UserCheck,
  CheckCircle,
  Lock,
  FileText,
  ScanLine,
  Users,
  ClipboardList,
} from 'lucide-react'

export default function PublicLandingPage() {
  const [branding, setBranding] = useState<{
    college_name: string
    logo_url: string | null
    department_logo_url: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/branding')
      .then(res => res.ok ? res.json() : { data: null })
      .then(json => {
        if (cancelled || !json?.data) return
        setBranding({
          college_name: json.data.college_name || 'Department of Land Warfare',
          logo_url: json.data.logo_url,
          department_logo_url: json.data.department_logo_url,
          primary_color: json.data.primary_color || '#4B5320',
          secondary_color: json.data.secondary_color || '#556B2F',
          accent_color: json.data.accent_color || '#C8A646',
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const primaryColor = branding?.primary_color || '#4B5320'
  const secondaryColor = branding?.secondary_color || '#556B2F'
  const accentColor = branding?.accent_color || '#C8A646'
  const institutionLogo = branding?.logo_url || '/images/afcsc-logo.png'
  const collegeName = branding?.college_name || 'Department of Land Warfare'
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#0B0F08] text-[#F5F5DC]">
      <MilitaryHeader />

      <main>
        <section className="relative overflow-hidden bg-[#0B0F08]">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C8A646]/40 to-transparent" />
            <div className="absolute top-20 left-10 w-72 h-72 bg-[#4B5320]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#556B2F]/10 rounded-full blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-16 md:pb-24 relative">
            <div className="text-center">
              <div className="max-w-4xl mx-auto">
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#F5F5DC]">
                      Visitors Management System
                    </h1>
                </div>
                <p className="text-base sm:text-lg md:text-xl text-[#9A9F87] max-w-3xl mx-auto leading-relaxed">
                  Secure Visitor Registration &amp; Access Management
                </p>
                <p className="mt-4 text-sm sm:text-base text-[#6B705A] max-w-3xl mx-auto leading-relaxed">
                  A centralized visitor registration and access management platform for the Department of Land Warfare,
                  providing secure visitor processing, host verification, access control, and visitor tracking.
                </p>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/visitors/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#C8A646] bg-[#C8A646] px-8 py-3.5 text-sm font-bold text-[#0B0F08] hover:bg-[#B89635] transition-colors min-h-[48px]"
                >
                  <UserCheck className="h-4 w-4" />
                  Register Visitor
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(85,107,47,0.5)] bg-transparent px-8 py-3.5 text-sm font-semibold text-[#F5F5DC] hover:bg-[#4B5320]/10 transition-colors min-h-[48px]"
                >
                  <Lock className="h-4 w-4" />
                  Staff Login
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
            <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 40L60 35C120 30 240 20 360 18C480 16 600 22 720 24C840 26 960 24 1080 22C1200 20 1320 18 1380 17L1440 16V40H0Z" fill="#141A10" />
            </svg>
          </div>
        </section>

        <section className="py-16 bg-[#141A10]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5DC] tracking-tight">Campus Gallery</h2>
              <p className="mt-2 text-sm text-[#9A9F87] max-w-2xl mx-auto">
                A glimpse of the Department of Land Warfare and AFCSC facilities.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { src: '/images/home/hero.jpg', alt: 'Campus hero view' },
                { src: '/images/home/gate.jpg', alt: 'Main gate' },
                { src: '/images/home/command.jpg', alt: 'Command building' },
                { src: '/images/home/campus.jpg', alt: 'Campus overview' },
                { src: '/images/home/auditorium.jpg', alt: 'Auditorium' },
              ].map((item) => (
                <div
                  key={item.src}
                  className="rounded-lg border border-[rgba(85,107,47,0.25)] bg-[#0B0F08] overflow-hidden hover:border-[rgba(200,166,70,0.4)] transition-colors"
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-[#141A10]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5DC] tracking-tight">Visitor Operations</h2>
              <p className="mt-2 text-sm text-[#9A9F87] max-w-2xl mx-auto">
                Secure registration and controlled visitor processing for the Department of Land Warfare.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: FileText,
                  title: 'Secure Registration',
                  desc: 'Visitor information is captured and validated before access processing.',
                },
                {
                  icon: Users,
                  title: 'Host Verification',
                  desc: 'Visitors are associated with authorized staff hosts and departments.',
                },
                {
                  icon: ScanLine,
                  title: 'Access Control',
                  desc: 'Visitor approval, check-in and check-out are tracked and verified.',
                },
                {
                  icon: ClipboardList,
                  title: 'Audit Trail',
                  desc: 'Visitor activities are recorded for administrative accountability.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[rgba(85,107,47,0.25)] bg-[#0B0F08] p-5 hover:border-[rgba(200,166,70,0.4)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-md bg-[#4B5320]/10 text-[#C8A646]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#F5F5DC]">{item.title}</h3>
                  </div>
                  <p className="text-xs text-[#9A9F87] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-[#10150D] border-t border-[rgba(85,107,47,0.2)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#C8A646]" />
                <div>
                  <p className="text-xs font-semibold text-[#F5F5DC] uppercase tracking-wider">System Status</p>
                  <p className="text-[10px] text-[#9A9F87]">Operational</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/visitors/new" className="text-xs text-[#9A9F87] hover:text-[#C8A646] transition-colors">
                  Register Visitor
                </Link>
                <Link href="/login" className="text-xs text-[#9A9F87] hover:text-[#C8A646] transition-colors">
                  Staff Login
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-[#0B0F08] border-t border-[rgba(85,107,47,0.2)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col items-center text-center gap-2">
              <p className="text-sm font-bold text-[#F5F5DC] uppercase tracking-wider">Visitors Management System</p>
              <p className="text-xs text-[#9A9F87]">Department of Land Warfare</p>
              <p className="text-xs text-[#9A9F87]">Armed Forces Command and Staff College</p>
              <p className="text-[10px] text-[#9A9F87] mt-2">&copy; {year} All Rights Reserved</p>
              <p className="text-[10px] font-semibold text-[#C8A646] uppercase tracking-wider mt-1">Authorized Access Only</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

