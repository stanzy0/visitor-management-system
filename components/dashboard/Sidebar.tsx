'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Clock,
  UserCheck,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  Monitor,
  Calendar,
  Building2,
  BarChart3,
  IdCard,
  Scan,
  Car,
  Bell,
  AlertTriangle,
  ShieldAlert,
  Crown,
  Shield,
  Activity,
  GitBranch,
  FileDown,
  Database,
  HardDrive,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getCurrentUser, UserRole, PERMISSIONS } from '@/lib/auth-client'
import { slideInRight, staggerContainer, fadeUp } from '@/lib/animations/variants'

const NAV_SECTIONS = [
  { title: 'MAIN', items: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard' },
    { label: 'Reception Kiosk', icon: Monitor, href: '/reception/kiosk', permission: 'dashboard' },
    { label: 'Self Check-In Kiosk', icon: QrCode, href: '/kiosk', permission: 'dashboard' },
    { label: 'Visitors', icon: Users, href: '/visitors', permission: 'visitors' },
    { label: 'Appointments', icon: Calendar, href: '/appointments', permission: 'appointments' },
    { label: 'Visits', icon: Clock, href: '/visits', permission: 'visits' },
    { label: 'Badges', icon: IdCard, href: '/badges', permission: 'badges' },
    { label: 'QR Scanner', icon: Scan, href: '/scanner', permission: 'scanner' },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Security Dashboard', icon: ShieldAlert, href: '/security', permission: 'scanner' },
    { label: 'Gate Check-In', icon: Scan, href: '/security/gate', permission: 'scanner' },
    { label: 'Exit Control', icon: LogOut, href: '/security/exit', permission: 'scanner' },
    { label: 'Gate Activity', icon: Monitor, href: '/security/gate-activity', permission: 'scanner' },
    { label: 'Watchlist', icon: ShieldAlert, href: '/watchlist', permission: 'watchlist' },
    { label: 'Security Reports', icon: FileText, href: '/security/reports', permission: 'scanner' },
    { label: 'ID Verification', icon: FileText, href: '/documents', permission: 'documents' },
    { label: 'Emergency Occupancy', icon: AlertTriangle, href: '/emergency', permission: 'emergency' },
    { label: 'Host Portal', icon: Users, href: '/host', permission: 'host' },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Admin Portal', icon: Shield, href: '/admin', permission: 'dashboard' },
    { label: 'Employees', icon: UserCheck, href: '/employees', permission: 'employees' },
    { label: 'Office Locations', icon: Building2, href: '/office-locations', permission: 'settings' },
    { label: 'Vehicle Management', icon: Car, href: '/vehicles', permission: 'vehicles' },
    { label: 'Users', icon: Users, href: '/users', permission: 'users' },
    { label: 'System Monitoring', icon: Monitor, href: '/system', permission: 'dashboard' },
  ]},
  { title: 'DEPLOYMENT & RECOVERY', items: [
    { label: 'Deployment Center', icon: GitBranch, href: '/deployment', permission: 'dashboard' },
    { label: 'Backups', icon: Database, href: '/deployment/backups', permission: 'dashboard' },
    { label: 'Restore Center', icon: FileDown, href: '/deployment/restore', permission: 'dashboard' },
    { label: 'Maintenance Mode', icon: Settings, href: '/deployment/maintenance', permission: 'dashboard' },
    { label: 'Version Management', icon: GitBranch, href: '/deployment/version', permission: 'dashboard' },
    { label: 'System Info', icon: HardDrive, href: '/deployment/system-info', permission: 'dashboard' },
  ]},
  { title: 'MONITORING', items: [
    { label: 'Notifications', icon: Bell, href: '/notifications', permission: 'dashboard' },
    { label: 'Audit Logs', icon: ShieldCheck, href: '/audit-logs', permission: 'audit-logs' },
    { label: 'Reports', icon: FileText, href: '/reports', permission: 'reports' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics', permission: 'analytics' },
    { label: 'Operations Center', icon: Activity, href: '/operations', permission: 'operations' },
    { label: 'Email Logs', icon: FileText, href: '/email-logs', permission: 'email' },
  ]},
   { title: 'ASSETS & PROPERTY', items: [
    { label: 'Assets & Property', icon: ShieldCheck, href: '/assets', permission: 'dashboard' },
  ]},
  { title: 'CONFIGURATION', items: [
    { label: 'Badge Designer', icon: Shield, href: '/admin/badges', permission: 'badges' },
    { label: 'Settings', icon: Settings, href: '/settings', permission: 'settings' },
  ]},
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  userRole: UserRole
  userEmail: string
  onLogout: () => void
  currentPath?: string
}

export default function Sidebar({ open, onClose, userRole, userEmail, onLogout, currentPath }: SidebarProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    setTimeout(() => setMounted(true), 0)
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setTimeout(() => setIsDesktop(mq.matches), 0)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const getNavItems = (sectionItems: typeof NAV_SECTIONS[0]['items']) =>
    sectionItems.filter(item => PERMISSIONS[userRole]?.includes(item.permission))

  const greeting = mounted
    ? new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'
    : 'Welcome'

  const sidebarVisible = isDesktop || open

  return (
    <>
      <AnimatePresence>
        {sidebarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: sidebarVisible ? 0 : '-100%',
          width: 280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 shadow-xl lg:relative lg:translate-x-0"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">VMS</span>
              <span className="text-xs text-slate-400 block -mt-0.5">Command Center</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800">
          <p className="text-sm font-medium text-white">{greeting}, {(userEmail || '').split('@')[0]}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 font-mono">
              {mounted ? liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize">{userRole}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {NAV_SECTIONS.map((section) => {
              const items = getNavItems(section.items)
              if (items.length === 0) return null
              return (
                <div key={section.title}>
                  <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{section.title}</h3>
                  <motion.ul variants={staggerContainer} className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath?.startsWith(item.href))
                      return (
                        <motion.li key={item.label} variants={fadeUp} custom={0}>
                          <a
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500'}`}>
                              <item.icon className="h-4 w-4" />
                            </div>
                            <span>{item.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-indicator"
                                className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            )}
                          </a>
                        </motion.li>
                      )
                    })}
                  </motion.ul>
                </div>
              )
            })}
          </motion.div>
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/50 transition-colors w-full"
          >
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <LogOut className="h-4 w-4" />
            </div>
            Logout
          </motion.button>
        </div>
      </motion.aside>
    </>
  )
}
