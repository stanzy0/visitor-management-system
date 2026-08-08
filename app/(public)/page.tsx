import ImageWithFallback from '@/components/ui/ImageWithFallback'
import MobileMenu from '@/components/ui/MobileMenu'
import Link from 'next/link'
import {
  ShieldCheck,
  Scan,
  UserCheck,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  Activity,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react'

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0B3D91] to-[#0B3D91] flex items-center justify-center shadow-md">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <ImageWithFallback
                  src="/images/afcsc-logo.png"
                  alt="AFCSC Logo"
                  className="h-10 w-10 rounded-lg object-contain"
                />
                <div>
                  <h1 className="text-base font-bold text-gray-900 leading-tight">
                    Armed Forces Command and Staff College
                  </h1>
                  <p className="text-xs text-gray-500 leading-tight">Visitor Management System</p>
                </div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/register" className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] transition-colors">
                Register
              </Link>
              <Link href="/register/status" className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] transition-colors">
                Check Status
              </Link>
              <Link href="/appointments" className="text-sm font-medium text-gray-600 hover:text-[#0B3D91] transition-colors">
                Appointments
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7B0000] transition-colors shadow-md shadow-[#C62828]/20">
                Staff Login
              </Link>
            </nav>
            <MobileMenu />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0B3D91] via-[#0B3D91] to-[#0A1628]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D4AF37] rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#C62828] rounded-full blur-3xl"></div>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 pb-24 md:pb-32 relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                <span className="text-sm font-medium text-white/90">Welcome to AFCSC</span>
              </div>
              <div className="flex justify-center mb-5">
                <ImageWithFallback
                  src="/images/afcsc-logo.png"
                  alt="AFCSC Logo"
                  className="h-[110px] w-[110px] sm:h-[145px] sm:w-[145px] md:h-[170px] md:w-[170px] object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Armed Forces Command and Staff College
              </h2>
              <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">
                The Visitor Management System streamlines guest registration, badge generation, and security check-in for all visitors to the college premises.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-8 py-4 text-lg font-semibold text-[#0A1628] hover:bg-[#F0D060] transition-colors shadow-lg shadow-yellow-500/20 min-h-[52px]"
                >
                  <UserCheck className="h-5 w-5" />
                  Register Visitor
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-colors min-h-[52px]"
                >
                  Staff Login
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0H0V60Z" fill="white" />
            </svg>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900">Visitor Management Features</h3>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                A comprehensive system designed to streamline visitor registration, security, and campus access management.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: UserCheck, title: 'Visitor Registration', desc: 'Easy online registration for all visitors with ID verification and pre-approval workflows.', color: 'from-[#0B3D91] to-[#0B3D91]', iconBg: 'bg-[#0B3D91]', iconText: 'text-white' },
                { icon: Scan, title: 'QR Badge Generation', desc: 'Instant QR code badges for quick and secure gate verification and check-in.', color: 'from-[#D4AF37] to-[#F0D060]', iconBg: 'bg-[#D4AF37]', iconText: 'text-[#0A1628]' },
                { icon: Users, title: 'Employee Directory', desc: 'Access the employee directory to find hosts and departments quickly.', color: 'from-[#C62828] to-[#7B0000]', iconBg: 'bg-[#C62828]', iconText: 'text-white' },
                { icon: Calendar, title: 'Appointment Scheduling', desc: 'Schedule and manage visitor appointments with real-time availability.', color: 'from-[#0B3D91] to-[#0B3D91]', iconBg: 'bg-[#0B3D91]', iconText: 'text-white' },
                { icon: CheckCircle, title: 'Check-In / Check-Out', desc: 'Streamlined check-in and check-out process with digital signatures.', color: 'from-[#D4AF37] to-[#F0D060]', iconBg: 'bg-[#D4AF37]', iconText: 'text-[#0A1628]' },
                { icon: Activity, title: 'Reports & Analytics', desc: 'Comprehensive reporting and analytics on visitor trends and security data.', color: 'from-[#C62828] to-[#7B0000]', iconBg: 'bg-[#C62828]', iconText: 'text-white' },
                { icon: ShieldCheck, title: 'Security Monitoring', desc: 'Real-time security monitoring and alerting for all campus visitors.', color: 'from-[#0B3D91] to-[#0B3D91]', iconBg: 'bg-[#0B3D91]', iconText: 'text-white' },
              ].map((feature, i) => (
                <div key={i} className="group rounded-2xl bg-white p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-7 w-7 ${feature.iconText}`} />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{feature.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900">Campus Gallery</h3>
              <p className="mt-4 text-lg text-gray-600">Explore the Armed Forces Command and Staff College campus.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative group rounded-2xl overflow-hidden shadow-lg h-64">
                <ImageWithFallback src="/images/home/hero.jpg" alt="Hero" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-semibold text-lg">Main Entrance</span>
                </div>
              </div>
              <div className="relative group rounded-2xl overflow-hidden shadow-lg h-64">
                <ImageWithFallback src="/images/home/campus.jpg" alt="Campus" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-semibold text-lg">Campus View</span>
                </div>
              </div>
              <div className="relative group rounded-2xl overflow-hidden shadow-lg h-64">
                <ImageWithFallback src="/images/home/gate.jpg" alt="Gate" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-semibold text-lg">Security Gate</span>
                </div>
              </div>
              <div className="relative group rounded-2xl overflow-hidden shadow-lg h-64">
                <ImageWithFallback src="/images/home/auditorium.jpg" alt="Auditorium" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-semibold text-lg">Auditorium</span>
                </div>
              </div>
              <div className="relative group rounded-2xl overflow-hidden shadow-lg h-64 md:col-span-2">
                <ImageWithFallback src="/images/home/command.jpg" alt="Command" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-semibold text-lg">Command Headquarters</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-br from-[#0A1628] to-[#1a2a4a]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-white">About AFCSC</h3>
                <p className="mt-4 text-lg text-white/70 leading-relaxed">
                  The Armed Forces Command and Staff College is a premier military institution dedicated to training and educating senior military officers for command and staff roles. Our Visitor Management System ensures secure, efficient, and professional handling of all visitors to the college premises.
                </p>
                <p className="mt-4 text-lg text-white/70 leading-relaxed">
                  The system provides seamless registration, QR badge generation, appointment scheduling, and real-time security monitoring — all designed to maintain the highest standards of campus security while providing a welcoming experience for guests.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-white/80">
                    <MapPin className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-sm">Jiwa, Abuja, Nigeria</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Phone className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-sm">+234 803 000 0000</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Mail className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-sm">reception@afcsc.edu.ng</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <ImageWithFallback src="/images/afcsc-login.jpg" alt="AFCSC Campus" className="w-full h-80 lg:h-96 object-cover" />
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#D4AF37] rounded-2xl -z-10 opacity-20"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-[#0B3D91] to-[#0B3D91] overflow-hidden shadow-2xl shadow-[#0B3D91]/20">
              <div className="px-8 py-16 md:px-16 md:py-20 text-center">
                <h3 className="text-3xl font-bold text-white sm:text-4xl">Ready to Register Your Visit?</h3>
                <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
                  Complete your visitor registration online before arriving at the college. Save time at the gate and ensure a smooth check-in experience.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-8 py-4 text-lg font-semibold text-[#0A1628] hover:bg-[#F0D060] transition-colors shadow-lg shadow-yellow-500/20 min-h-[52px]"
                  >
                    Start Registration
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/register/status"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-colors min-h-[52px]"
                  >
                    Check Status
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0A1628] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0B3D91] to-[#0B3D91] flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <ImageWithFallback
                  src="/images/afcsc-logo.png"
                  alt="AFCSC Logo"
                  className="h-10 w-10 rounded-lg object-contain"
                />
                <div>
                  <h4 className="text-lg font-semibold">Armed Forces Command and Staff College</h4>
                  <p className="text-sm text-white/50">Visitor Management System</p>
                </div>
              </div>
              <p className="text-sm text-white/50 max-w-md mt-4 leading-relaxed">
                Secure and efficient visitor management for the Armed Forces Command and Staff College. Streamlining guest access while maintaining the highest security standards.
              </p>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-4">Quick Links</h5>
              <ul className="space-y-3">
                <li><Link href="/register" className="text-sm text-white/60 hover:text-white transition-colors">Register Visitor</Link></li>
                <li><Link href="/register/status" className="text-sm text-white/60 hover:text-white transition-colors">Check Status</Link></li>
                <li><Link href="/appointments" className="text-sm text-white/60 hover:text-white transition-colors">Appointments</Link></li>
                <li><Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Staff Login</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-4">Contact</h5>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="h-4 w-4 text-[#D4AF37]" />
                  Jiwa, Abuja, Nigeria
                </li>
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <Phone className="h-4 w-4 text-[#D4AF37]" />
                  +234 803 000 0000
                </li>
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <Mail className="h-4 w-4 text-[#D4AF37]" />
                  reception@afcsc.edu.ng
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/40">© {new Date().getFullYear()} Armed Forces Command and Staff College. All rights reserved.</p>
            <p className="text-sm text-white/40 mt-2 md:mt-0">Visitor Management System v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}