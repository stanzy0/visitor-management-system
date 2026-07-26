import Link from 'next/link'
import { ShieldCheck, Scan, UserCheck, Clock, FileText, Car, Bell, CheckCircle } from 'lucide-react'

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AFCSC Visitor Management</h1>
                <p className="text-sm text-gray-500">Armed Forces Command and Staff College</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/register/status" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Check Status
              </Link>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Visitor Self-Registration
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Welcome to the Armed Forces Command and Staff College. Register your visit online before arriving to save time at the gate.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 min-h-[52px]"
                >
                  Start Registration
                </Link>
                <Link
                  href="/register/status"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50 border border-gray-300 min-h-[52px]"
                >
                  Check Registration Status
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Visitor Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Valid ID Required</h4>
                <p className="text-gray-600">Bring a valid government-issued photo ID that matches the details provided during registration.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Arrive on Time</h4>
                <p className="text-gray-600">Please arrive at the scheduled time. Early arrivals may need to wait until the appointed time.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Vehicle Information</h4>
                <p className="text-gray-600">If driving, provide vehicle registration details during registration to expedite gate clearance.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">What to Expect</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">1</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Register Online</h4>
                <p className="text-gray-600">Complete the registration form with your details and visit information.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">2</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Receive Confirmation</h4>
                <p className="text-gray-600">You will receive an email confirmation with your registration number and QR code.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">3</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Gate Verification</h4>
                <p className="text-gray-600">At the gate, present your QR code and ID for security verification.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">4</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Check In</h4>
                <p className="text-gray-600">After security clearance, proceed to your host department.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-8 md:p-12">
              <div className="md:flex md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Need Assistance?</h3>
                  <p className="mt-2 text-gray-600">Contact the reception desk for help with your registration.</p>
                  <div className="mt-4 space-y-1 text-sm text-gray-600">
                    <p><strong>Phone:</strong> +234 803 000 0000</p>
                    <p><strong>Email:</strong> reception@afcsc.edu.ng</p>
                    <p><strong>Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</p>
                  </div>
                </div>
                <div className="mt-6 md:mt-0">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 shadow-lg min-h-[52px]"
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-lg font-semibold">Armed Forces Command and Staff College</h4>
              <p className="mt-1 text-sm text-gray-400">Visitor Management System</p>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-gray-400">
              <p>Jiwa, Abuja, Nigeria</p>
              <p>+234 803 000 0000</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} AFCSC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
