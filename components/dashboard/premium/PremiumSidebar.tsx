'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Clock,
  UserCheck,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
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
  Shield,
  Activity,
  GitBranch,
  FileDown,
  Database,
  HardDrive,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react'
import { UserRole, PERMISSIONS } from '@/lib/auth-client'
import { staggerContainer, fadeUp } from '@/lib/animations/variants'

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
    { label: 'Branding', icon: Palette, href: '/settings/branding', permission: 'settings' },
    { label: 'Badge Designer', icon: Shield, href: '/admin/badges', permission: 'badges' },
    { label: 'Settings', icon: Settings, href: '/settings', permission: 'settings' },
  ]},
]

interface PremiumSidebarProps {
  open: boolean
  onClose: () => void
  userRole: UserRole
  userEmail: string
  onLogout: () => void
  currentPath?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}

export default function PremiumSidebar({
  open,
  onClose,
  userRole,
  userEmail,
  onLogout,
  currentPath,
  collapsed = false,
  onToggleCollapse,
}: PremiumSidebarProps) {
  const [liveTime, setLiveTime] = useState(new Date())
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const getNavItems = (sectionItems: typeof NAV_SECTIONS[0]['items']) =>
    sectionItems.filter(item => PERMISSIONS[userRole]?.includes(item.permission))

  const isCollapsed = collapsed && isDesktop

  if (typeof window !== 'undefined') {
    console.log('[PREMIUM-SIDEBAR]', {
      isDesktop,
      open,
      sidebarVisible: isDesktop || open,
      innerWidth: window.innerWidth,
      matchMediaLg: window.matchMedia('(min-width: 1024px)').matches,
    })
  }

  return (
    <>
      <AnimatePresence>
        {open && !isDesktop && (
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
          x: isDesktop ? 0 : (open ? 0 : '-100%'),
          width: isCollapsed ? 80 : 280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 shadow-2xl lg:relative lg:translate-x-0 lg:w-[280px]"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <motion.div
            className="flex items-center gap-3"
            style={{ display: isCollapsed ? 'flex' : 'flex' }}
          >
            <div className="p-2 rounded-xl bg-primary shadow-lg shadow-primary/30 flex-shrink-0">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <span className="text-lg font-bold text-white tracking-tight">AFCSC VMS</span>
                <span className="text-xs text-slate-400 block -mt-0.5">Command Center</span>
              </motion.div>
            )}
          </motion.div>

          {onToggleCollapse && isDesktop && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </motion.button>
          )}

          {!isDesktop && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          )}
        </div>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800"
          >
            <p className="text-sm font-medium text-white">
               {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {(userEmail || '').split('@')[0]}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-slate-400 font-mono">
                {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1 capitalize">{userRole}</p>
          </motion.div>
        )}

        <nav className={`flex-1 overflow-y-auto scrollbar-thin ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {NAV_SECTIONS.map((section) => {
              const items = getNavItems(section.items)
              if (items.length === 0) return null
              return (
                <div key={section.title}>
                  {!isCollapsed && (
                    <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {section.title}
                    </h3>
                  )}
                  <motion.ul variants={staggerContainer} className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath?.startsWith(item.href))
                      return (
                        <motion.li key={item.label} variants={fadeUp} custom={0}>
                          <a
                            href={item.href}
                            onClick={() => { if (!isDesktop) onClose() }}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                            aria-label={item.label}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                              isActive ? 'bg-primary/20 text-white' : 'text-slate-500 group-hover:text-slate-300'
                            }`}>
                              <item.icon className="h-4 w-4" />
                            </div>
                            {!isCollapsed && <span>{item.label}</span>}
                            {isActive && !isCollapsed && (
                              <motion.div
                                layoutId="sidebar-active-indicator"
                                className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/50 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            aria-label="Logout"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400 flex-shrink-0">
              <LogOut className="h-4 w-4" />
            </div>
            {!isCollapsed && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>
    </>
  )
}
