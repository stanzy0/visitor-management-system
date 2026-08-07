import PublicRegistrationWizard from '@/components/PublicRegistrationWizard'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0B3D91] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">
              <Image
                src="/images/afcsc-logo.png"
                alt="AFCSC Logo"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                priority
              />
            </div>
            <div className="text-center px-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Visitor Registration</h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">Armed Forces Command and Staff College</p>
              <p className="text-xs text-gray-400">Kaduna, Nigeria</p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src="/images/afcsc-logo.png"
                alt="AFCSC Logo"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-end gap-4">
            <Link href="/register/status" className="text-sm font-medium text-[#0B3D91] hover:text-[#4DA6FF]">Check Status</Link>
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">Home</Link>
          </div>
        </div>
      </nav>
      <PublicRegistrationWizard />
    </div>
  )
}