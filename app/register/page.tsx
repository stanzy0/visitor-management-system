import PublicRegistrationWizard from '@/components/PublicRegistrationWizard'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/images/afcsc-logo.png"
                alt="AFCSC Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
              <div className="hidden sm:block">
                <p className="text-xs text-gray-500 leading-tight">Armed Forces Command and Staff College</p>
                <p className="text-xs text-gray-400 leading-tight">Kaduna, Nigeria</p>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/register/status" className="text-sm font-medium text-[#0B3D91] hover:text-[#4DA6FF]">
                Check Status
              </Link>
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <PublicRegistrationWizard />
    </div>
  )
}
