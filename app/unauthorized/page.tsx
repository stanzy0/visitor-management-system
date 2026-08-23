'use client'

import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen bg-[#0B0F08] items-center justify-center p-4">
      <div className="text-center max-w-md">
        <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#F5F5DC] mb-2">Access Denied</h1>
        <p className="text-[#9A9F87] mb-6">
          You do not have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  )
}
