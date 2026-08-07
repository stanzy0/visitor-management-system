'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {open && (
        <div className="md:hidden border-t border-gray-100 py-4 flex flex-col gap-3 absolute top-full left-0 right-0 bg-white shadow-lg z-50">
          <Link
            href="/register"
            className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] px-2 py-1"
            onClick={() => setOpen(false)}
          >
            Register
          </Link>
          <Link
            href="/register/status"
            className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] px-2 py-1"
            onClick={() => setOpen(false)}
          >
            Check Status
          </Link>
          <Link
            href="/appointments"
            className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] px-2 py-1"
            onClick={() => setOpen(false)}
          >
            Appointments
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] px-2 py-1"
            onClick={() => setOpen(false)}
          >
            Staff Login
          </Link>
        </div>
      )}
    </>
  )
}