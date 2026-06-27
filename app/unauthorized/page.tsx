'use client'

import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="text-center max-w-md">
        <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
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