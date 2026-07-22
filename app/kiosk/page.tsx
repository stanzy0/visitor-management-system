'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, UserRole } from '@/lib/auth'
import { Users, Scan, LogIn, LogOut, Printer, Calendar, Clock, UserCheck, Search, Loader2, Phone, Mail, MapPin, ShieldCheck, Monitor, X, Keyboard, BadgeCheck, Hourglass, ClipboardCheck, Activity, XCircle, RefreshCw, QrCode } from 'lucide-react'
import { logAuditAction } from '@/lib/client/audit'
import { printBadgeWindow } from '@/lib/badge/badge-print'
import { createBadge, reprintBadge, cancelBadge } from '@/lib/client/badges'
import type { VisitorBadge } from '@/lib/badge/badge-types'

interface Visit { id: string; visitor_id: string; employee_id: string; purpose: string; status: 'pending'|'approved'|'rejected'|'checked_in'|'checked_out'; check_in_time: string | null; check_out_time: string | null; created_at: string; visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null; phone: string | null; email: string | null } | null; employee: { full_name: string; department: string; office_location: string } | null; badge?: VisitorBadge | null }
interface Appointment { id: string; visitor_id: string; employee_id: string; appointment_date: string; expected_arrival: string | null; purpose: string; status: string; visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null; phone: string | null } | null; employee: { full_name: string; department: string } | null }
interface KioskStats { visitorsToday: number; visitorsWaiting: number; approvedVisitors: number; currentlyOnSite: number; checkedOutToday: number; activeBadges: number; cancelledBadges: number; expiredBadges: number }
type VisitStatus = Visit['status']

const STATUS_STYLES: Record<string,{bg:string;text:string;border:string}> = { pending:{bg:'bg-amber-50',text:'text-amber-700',border:'border-amber-200'}, approved:{bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-200'}, checked_in:{bg:'bg-green-50',text:'text-green-700',border:'border-green-200'}, checked_out:{bg:'bg-gray-50',text:'text-gray-700',border:'border-gray-200'} }
const BADGE_STYLES: Record<string,{bg:string;text:string;border:string}> = { Active:{bg:'bg-emerald-50',text:'text-emerald-700',border:'border-emerald-200'}, Expired:{bg:'bg-red-50',text:'text-red-700',border:'border-red-200'}, 'Checked Out':{bg:'bg-gray-50',text:'text-gray-700',border:'border-gray-200'}, Cancelled:{bg:'bg-orange-50',text:'text-orange-700',border:'border-orange-200'} }
const TOUCH = 'min-h-[52px] px-5 py-3 rounded-xl text-base font-semibold transition-all duration-200 touch-manipulation select-none active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'

function StatCard({icon:Icon,label,value,color}:{icon:any;label:string;value:number;color:string}) {
  const map: Record<string,string> = { blue:'from-blue-500 to-blue-600 shadow-blue-500/20', green:'from-green-500 to-green-600 shadow-green-500/20', purple:'from-purple-500 to-purple-600 shadow-purple-500/20', amber:'from-amber-500 to-amber-600 shadow-amber-500/20', gray:'from-gray-500 to-gray-600 shadow-gray-500/20', emerald:'from-emerald-500 to-emerald-600 shadow-emerald-500/20', orange:'from-orange-500 to-orange-600 shadow-orange-500/20', red:'from-red-500 to-red-600 shadow-red-500/20', indigo:'from-indigo-500 to-indigo-600 shadow-indigo-500/20' }
  const grad = map[color]||map.blue
  return (<div className='rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-4'><div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white shadow-md`}><Icon className='h-6 w-6' /></div><div><p className='text-3xl font-bold text-gray-900 leading-none'>{value}</p><p className='text-xs text-gray-500 mt-1'>{label}</p></div></div>)
}

function DetailItem({icon:Icon,label,value}:{icon:any;label:string;value:string}) {
  return (<div className='flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3'><div className='mt-0.5 text-gray-400'><Icon className='h-4 w-4' /></div><div className='min-w-0'><p className='text-xs text-gray-500 uppercase tracking-wide'>{label}</p><p className='text-sm font-medium text-gray-900 break-words'>{value}</p></div></div>)
}

function ShortcutsModal({onClose}:{onClose:()=>void}) {
  return (<div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={onClose}><div className='bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl' onClick={e=>e.stopPropagation()}><div className='flex items-center justify-between mb-4'><h3 className='text-lg font-bold text-gray-900'>Keyboard Shortcuts</h3><button onClick={onClose} className='min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100'><X className='h-5 w-5 text-gray-500' /></button></div><div className='space-y-2'>{[['Ctrl+F','Focus search'],['Ctrl+I','Check in selected visitor'],['Ctrl+O','Check out selected visitor'],['Ctrl+P','Print / generate badge'],['Esc','Close panel']].map(([keys,label])=>(<div key={label} className='flex items-center justify-between rounded-xl border border-gray-200 px-4 py-2'><span className='text-sm text-gray-700'>{label}</span><div className='flex items-center gap-1'>{keys.split('+').map(k=>(<kbd key={k} className='rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm'>{k}</kbd>))}</div></div>))}</div></div></div>)
}

export default function KioskPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('Receptionist')
  const [stats, setStats] = useState<KioskStats>({ visitorsToday: 0, visitorsWaiting: 0, approvedVisitors: 0, currentlyOnSite: 0, checkedOutToday: 0, activeBadges: 0, cancelledBadges: 0, expiredBadges: 0 })
  const [visits, setVisits] = useState<Visit[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [kioskLocked, setKioskLocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VisitStatus|'all'>('all')
  const [selectedVisit, setSelectedVisit] = useState<Visit|null>(null)
  const [actionLoading, setActionLoading] = useState<string|null>(null)
  const [notification, setNotification] = useState<{type:'success'|'error';message:string}|null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel>|null>(null)
  const inactivityTimer = useRef<NodeJS.Timeout|null>(null)
  const searchInputRef = useRef<HTMLInputElement|null>(null)
  const INACTIVITY_TIMEOUT = 5*60*1000

  const resetInactivityTimer = useCallback(()=>{
    if(inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if(!kioskLocked) inactivityTimer.current = setTimeout(()=>setKioskLocked(true), INACTIVITY_TIMEOUT)
  },[kioskLocked])

  const showNotification = useCallback((type:'success'|'error',message:string)=>{
    setNotification({type,message})
    setTimeout(()=>setNotification(null),3500)
  },[])

  const fetchStats = useCallback(async()=>{
    const today = new Date().toISOString().split('T')[0]
    const [vToday,approved,onSite,checkedOut,activeBadges,cancelledBadges,expiredBadges] = await Promise.all([
      supabase.from('visits').select('id',{count:'exact',head:true}).gte('created_at',today),
      supabase.from('visits').select('id',{count:'exact',head:true}).eq('status','approved'),
      supabase.from('visits').select('id',{count:'exact',head:true}).eq('status','checked_in'),
      supabase.from('visits').select('id',{count:'exact',head:true}).eq('status','checked_out').gte('created_at',today),
      supabase.from('visitor_badges').select('id',{count:'exact',head:true}).eq('badge_status','Active'),
      supabase.from('visitor_badges').select('id',{count:'exact',head:true}).eq('badge_status','Cancelled'),
      supabase.from('visitor_badges').select('id',{count:'exact',head:true}).eq('badge_status','Expired'),
    ])
    setStats({visitorsToday:vToday.count??0,visitorsWaiting:approved.count??0,approvedVisitors:approved.count??0,currentlyOnSite:onSite.count??0,checkedOutToday:checkedOut.count??0,activeBadges:activeBadges.count??0,cancelledBadges:cancelledBadges.count??0,expiredBadges:expiredBadges.count??0})
  },[])

  const fetchVisits = useCallback(async()=>{
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const {data,error} = await supabase.from('visits').select(`*,visitor:visitors(full_name,visitor_organization,photo_url,phone,email),employee:employees(full_name,department,office_location)`).gte('created_at',today).order('created_at',{ascending:false})
    if(error){showNotification('error',error.message);setLoading(false);return}
    if(data){
      const visitIds = data.map(v=>v.id)
      const {data:badges} = await supabase.from('visitor_badges').select('id,visit_id,badge_number,badge_status,qr_token,issued_at,expires_at,printed_at,printed_by,reprint_count,created_at,updated_at').in('visit_id',visitIds)
      const badgesByVisitId = new Map(badges?.map(b=>[b.visit_id,b])||[])
      setVisits(data.map(v=>({...v,badge:badgesByVisitId.get(v.id)||null})))
    }
    setLoading(false)
  },[showNotification])

  const fetchUpcomingAppointments = useCallback(async()=>{
    const today = new Date().toISOString().split('T')[0]
    const {data,error} = await supabase.from('appointments').select('*,visitor:visitors(full_name,visitor_organization,photo_url,phone),employee:employees(full_name,department)').gte('appointment_date',today).in('status',['Scheduled','Approved']).order('appointment_date',{ascending:true}).order('expected_arrival',{ascending:true})
    if(!error) setUpcomingAppointments(data||[])
  },[])

  const setupRealtime = useCallback(()=>{
    if(realtimeChannel.current) supabase.removeChannel(realtimeChannel.current)
    realtimeChannel.current = supabase.channel('kiosk-realtime').on('postgres_changes',{event:'*',schema:'public',table:'visits'},()=>{fetchVisits();fetchStats()}).on('postgres_changes',{event:'*',schema:'public',table:'visitor_badges'},()=>{fetchVisits();fetchStats()}).subscribe()
  },[fetchVisits,fetchStats])

  useEffect(()=>{
    const checkAuth = async()=>{
      const user = await getCurrentUser()
      if(!user){window.location.href='/login';return}
      if(user.role!=='Admin' && user.role!=='Receptionist'){window.location.href='/unauthorized';return}
      setUserRole(user.role)
      setAuthChecking(false)
      fetchStats()
      fetchVisits()
      fetchUpcomingAppointments()
      setupRealtime()
      resetInactivityTimer()
    }
    checkAuth()
    return ()=>{if(realtimeChannel.current)supabase.removeChannel(realtimeChannel.current);if(inactivityTimer.current)clearTimeout(inactivityTimer.current)}
  },[fetchStats,fetchVisits,fetchUpcomingAppointments,setupRealtime,resetInactivityTimer])

  useEffect(()=>{
    const handleActivity = ()=>resetInactivityTimer()
    window.addEventListener('mousedown',handleActivity)
    window.addEventListener('touchstart',handleActivity)
    window.addEventListener('keydown',handleActivity)
    return ()=>{window.removeEventListener('mousedown',handleActivity);window.removeEventListener('touchstart',handleActivity);window.removeEventListener('keydown',handleActivity)}
  },[resetInactivityTimer])

  useEffect(()=>{
    const handleKeyDown = (e:KeyboardEvent)=>{
      const isMod = e.ctrlKey||e.metaKey
      if(isMod && e.key.toLowerCase()==='f'){e.preventDefault();searchInputRef.current?.focus();return}
      if(isMod && e.key.toLowerCase()==='i'){e.preventDefault();const approved=visits.find(v=>v.status==='approved');if(approved)handleCheckIn(approved.id);return}
      if(isMod && e.key.toLowerCase()==='o'){e.preventDefault();const checkedIn=visits.find(v=>v.status==='checked_in');if(checkedIn)handleCheckOut(checkedIn.id);return}
      if(isMod && e.key.toLowerCase()==='p'){e.preventDefault();if(selectedVisit?.badge?.id)handlePrintBadge(selectedVisit);else if(selectedVisit)handleGenerateAndPrint(selectedVisit);return}
      if(e.key==='Escape'){if(selectedVisit)setSelectedVisit(null);else if(showShortcuts)setShowShortcuts(false)}
    }
    window.addEventListener('keydown',handleKeyDown)
    return ()=>window.removeEventListener('keydown',handleKeyDown)
  },[visits,selectedVisit,showShortcuts])

  const handlePinSubmit = ()=>{
    if(pinInput==='1234'){setKioskLocked(false);setPinInput('');setPinError(false);resetInactivityTimer()}
    else{setPinError(true);setPinInput('');setTimeout(()=>setPinError(false),2000)}
  }

  const handleCheckIn = async(visitId:string)=>{
    setActionLoading(visitId)
    const {error} = await supabase.from('visits').update({status:'checked_in',check_in_time:new Date().toISOString()}).eq('id',visitId)
    if(error){showNotification('error',error.message)}
    else{
      const visitorName = visits.find(v=>v.id===visitId)?.visitor?.full_name||'Visitor'
      const hostName = visits.find(v=>v.id===visitId)?.employee?.full_name||'Host'
      await logAuditAction('Visitor Checked In','visit',visitId,`${visitorName} checked in at ${new Date().toLocaleTimeString()} with ${hostName}`)
      setVisits(prev=>prev.map(v=>v.id===visitId?{...v,status:'checked_in',check_in_time:new Date().toISOString()}:v))
      await fetchStats()
      const visit = visits.find(v=>v.id===visitId)
      if(visit){
        if(visit.badge?.id){await printBadgeWindow(visit.badge.id);await logAuditAction('Badge Printed','badge',visit.badge.id,`Badge ${visit.badge.badge_number} printed on check-in for ${visitorName}`)}
        else{try{const badge=await createBadge(visitId,24);await printBadgeWindow(badge.id);await logAuditAction('Badge Generated','badge',badge.id,`Badge ${badge.badge_number} generated and printed on check-in for ${visitorName}`);setVisits(prev=>prev.map(v=>v.id===visitId?{...v,badge}:v))}catch(err){console.error('Auto badge generation failed:',err)}}
      }
      showNotification('success',`${visitorName} checked in successfully`)
    }
    setActionLoading(null)
  }

  const handleCheckOut = async(visitId:string)=>{
    setActionLoading(visitId)
    const visit = visits.find(v=>v.id===visitId)
    const visitorName = visit?.visitor?.full_name||'Visitor'
    const {error} = await supabase.from('visits').update({status:'checked_out',check_out_time:new Date().toISOString()}).eq('id',visitId)
    if(error){showNotification('error',error.message)}
    else{
      await logAuditAction('Visitor Checked Out','visit',visitId,`${visitorName} checked out at ${new Date().toLocaleTimeString()}`)
      setVisits(prev=>prev.map(v=>v.id===visitId?{...v,status:'checked_out',check_out_time:new Date().toISOString()}:v))
      await fetchStats()
      if(visit?.badge?.id){try{await cancelBadge(visit.badge.id);await logAuditAction('Badge Cancelled','badge',visit.badge.id,`Badge ${visit.badge.badge_number} cancelled on check-out for ${visitorName}`);setVisits(prev=>prev.map(v=>v.id===visitId?{...v,badge:{...v.badge!,badge_status:'Cancelled'}}:v))}catch(err){console.error('Badge cancellation failed:',err)}}
      showNotification('success',`${visitorName} checked out successfully`)
    }
    setActionLoading(null)
  }

  const handleGenerateAndPrint = async(visit:Visit)=>{
    setActionLoading(visit.id)
    try{const badge=await createBadge(visit.id,24);await printBadgeWindow(badge.id);await logAuditAction('Badge Generated','badge',badge.id,`Badge ${badge.badge_number} generated for ${visit.visitor?.full_name}`);showNotification('success',`Badge ${badge.badge_number} generated and printed`);setVisits(prev=>prev.map(v=>v.id===visit.id?{...v,badge}:v));if(selectedVisit?.id===visit.id)setSelectedVisit({...visit,badge})}catch(err){showNotification('error',err instanceof Error?err.message:'Failed to generate badge')}
    setActionLoading(null)
  }

  const handlePrintBadge = async(visit:Visit)=>{
    setActionLoading(visit.id)
    try{if(visit.badge?.id){await printBadgeWindow(visit.badge.id);await logAuditAction('Badge Printed','badge',visit.badge.id,`Badge ${visit.badge.badge_number} printed for ${visit.visitor?.full_name}`);showNotification('success','Badge printed successfully')}else{await handleGenerateAndPrint(visit);return}}catch(err){showNotification('error',err instanceof Error?err.message:'Failed to print badge')}
    setActionLoading(null)
  }

  const handleReprintBadge = async(badgeId:string)=>{
    setActionLoading(badgeId)
    try{await reprintBadge(badgeId);await printBadgeWindow(badgeId);const badge=visits.flatMap(v=>v.badge?[v.badge]:[]).find(b=>b.id===badgeId);await logAuditAction('Badge Reprinted','badge',badgeId,`Badge ${badge?.badge_number||badgeId} reprinted`);showNotification('success','Badge reprinted successfully');fetchVisits()}catch(err){showNotification('error',err instanceof Error?err.message:'Failed to reprint badge')}
    setActionLoading(null)
  }

  const handleCancelBadge = async(badgeId:string,visitId:string)=>{
    setActionLoading(badgeId)
    try{await cancelBadge(badgeId);await logAuditAction('Badge Cancelled','badge',badgeId,`Badge ${badgeId} cancelled`);showNotification('success','Badge cancelled successfully');setVisits(prev=>prev.map(v=>v.id===visitId?{...v,badge:v.badge?{...v.badge,badge_status:'Cancelled'}:null}:v));fetchStats();if(selectedVisit?.id===visitId){setSelectedVisit(prev=>prev?{...prev,badge:prev.badge?{...prev.badge,badge_status:'Cancelled'}:null}:null)}}catch(err){showNotification('error',err instanceof Error?err.message:'Failed to cancel badge')}
    setActionLoading(null)
  }

  const filteredVisits = visits.filter(v=>{
    const matchesStatus = statusFilter==='all'||v.status===statusFilter
    if(!matchesStatus) return false
    if(!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (v.visitor?.full_name||'').toLowerCase().includes(term)||(v.visitor?.phone||'').includes(term)||(v.visitor?.visitor_organization||'').toLowerCase().includes(term)||(v.badge?.badge_number||'').toLowerCase().includes(term)||(v.badge?.qr_token||'').toLowerCase().includes(term)||(v.employee?.full_name||'').toLowerCase().includes(term)||(v.employee?.department||'').toLowerCase().includes(term)
  })

  const statusCounts = visits.reduce<Record<string,number>>((acc,v)=>{acc[v.status]=(acc[v.status]||0)+1;return acc},{})

  if(authChecking) return (<div className="flex h-screen bg-gray-50 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>)

  if(kioskLocked) return (
    <div className="flex h-screen bg-gray-900 items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="flex justify-center mb-4"><ShieldCheck className="h-12 w-12 text-gray-400" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Kiosk Locked</h2>
        <p className="text-gray-600 mb-6 text-center text-base">Enter PIN to unlock</p>
        <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handlePinSubmit()} className="w-full text-center text-3xl tracking-widest px-4 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none mb-4" maxLength={4} placeholder="••••" autoFocus />
        <button onClick={handlePinSubmit} className={`${TOUCH} w-full bg-blue-600 text-white hover:bg-blue-700`}>Unlock</button>
        {pinError && <p className="text-red-600 text-center mt-4 font-medium">Invalid PIN</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" onClick={resetInactivityTimer} onTouchStart={resetInactivityTimer}>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reception Kiosk</h1>
              <p className="text-sm text-gray-500">Welcome, {userRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setShowShortcuts(true)} className={`${TOUCH} bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2`}>
              <Keyboard className="h-5 w-5" /><span className="hidden sm:inline">Shortcuts</span>
            </button>
            <button onClick={()=>setKioskLocked(true)} className={`${TOUCH} bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2`}>
              <LogOut className="h-5 w-5" /><span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {notification && (<div className={`mx-6 mt-4 rounded-xl p-4 text-center text-base font-medium shadow-sm ${notification.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{notification.message}</div>)}

      <main className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Visitors Today" value={stats.visitorsToday} color="blue" />
          <StatCard icon={ClipboardCheck} label="Visitors Waiting" value={stats.visitorsWaiting} color="amber" />
          <StatCard icon={BadgeCheck} label="Approved" value={stats.approvedVisitors} color="indigo" />
          <StatCard icon={UserCheck} label="Currently Inside" value={stats.currentlyOnSite} color="green" />
          <StatCard icon={LogOut} label="Checked Out Today" value={stats.checkedOutToday} color="gray" />
          <StatCard icon={Activity} label="Active Badges" value={stats.activeBadges} color="emerald" />
          <StatCard icon={XCircle} label="Cancelled Badges" value={stats.cancelledBadges} color="orange" />
          <StatCard icon={Hourglass} label="Expired Badges" value={stats.expiredBadges} color="red" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/visitors" className={`${TOUCH} bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20`}>
            <Users className="h-6 w-6" /><span className="text-lg">Register Visitor</span>
          </a>
          <a href="/scanner" className={`${TOUCH} bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20`}>
            <Scan className="h-6 w-6" /><span className="text-lg">QR Scanner</span>
          </a>
          <button onClick={()=>setKioskLocked(true)} className={`${TOUCH} bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center justify-center gap-3`}>
            <LogOut className="h-6 w-6" /><span className="text-lg">Lock Kiosk</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input ref={searchInputRef} type="text" placeholder="Search by name, phone, company, badge #, QR token..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                {[['All','all'],['Pending','pending'],['Approved','approved'],['Checked In','checked_in'],['Checked Out','checked_out']].map(([label,value])=>(
                  <button key={value} onClick={()=>setStatusFilter(value as any)} className={`whitespace-nowrap min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${statusFilter===value?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                    {label}{value!=='all'&&<span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs ${statusFilter===value?'bg-blue-500 text-white':'bg-gray-100 text-gray-600'}`}>{statusCounts[value]||0}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>) : filteredVisits.length===0 ? (
              <div className="py-16 text-center text-gray-500 text-lg">{searchTerm||statusFilter!=='all'?'No visits match your filters':'No visitors today'}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700 w-12"></th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Dept</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Badge</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Arrival</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVisits.map(visit=>{
                    const isSelected = selectedVisit?.id===visit.id
                    return (
                      <tr key={visit.id} className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${isSelected?'bg-blue-50':''}`} onClick={()=>setSelectedVisit(visit)}>
                        <td className="px-4 py-4">
                          {visit.visitor?.photo_url ? (<img src={visit.visitor.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><span className="text-sm font-semibold text-gray-500">{(visit.visitor?.full_name||'?').charAt(0).toUpperCase()}</span></div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900 text-base">{visit.visitor?.full_name||'—'}</p>
                          <p className="text-xs text-gray-500 md:hidden">{visit.visitor?.visitor_organization||''}</p>
                        </td>
                        <td className="px-4 py-4 text-gray-600 hidden md:table-cell">{visit.visitor?.visitor_organization||'—'}</td>
                        <td className="px-4 py-4 hidden lg:table-cell"><p className="text-gray-900">{visit.employee?.full_name||'—'}</p></td>
                        <td className="px-4 py-4 text-gray-600 hidden lg:table-cell">{visit.employee?.department||'—'}</td>
                        <td className="px-4 py-4 text-gray-600 hidden xl:table-cell max-w-[200px] truncate">{visit.purpose||'—'}</td>
                        <td className="px-4 py-4">
                          {visit.badge ? (<div className="space-y-1">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">{visit.badge.badge_number}</span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[visit.badge.badge_status]?.bg||'bg-gray-50'} ${BADGE_STYLES[visit.badge.badge_status]?.text||'text-gray-700'}`}>{visit.badge.badge_status}</span>
                          </div>) : (<span className="text-gray-400 text-xs">No badge</span>)}
                        </td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {visit.check_in_time ? new Date(visit.check_in_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                        </td>
                        <td className="px-4 py-4 text-right" onClick={e=>e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {visit.status==='approved' && (<button onClick={()=>handleCheckIn(visit.id)} disabled={actionLoading===visit.id} className={`${TOUCH} bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 text-sm py-2 px-3`} title="Check In">
                              {actionLoading===visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}<span className="hidden sm:inline">Check In</span>
                            </button>)}
                            {visit.status==='checked_in' && (<button onClick={()=>handleCheckOut(visit.id)} disabled={actionLoading===visit.id} className={`${TOUCH} bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm py-2 px-3`} title="Check Out">
                              {actionLoading===visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}<span className="hidden sm:inline">Check Out</span>
                            </button>)}
                            <button onClick={()=>visit.badge?.id?handlePrintBadge(visit):handleGenerateAndPrint(visit)} disabled={actionLoading===visit.id} className={`${TOUCH} bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 text-sm py-2 px-3`} title={visit.badge?'Print Badge':'Generate & Print Badge'}>
                              {actionLoading===visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}<span className="hidden sm:inline">{visit.badge?'Print':'Generate'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {upcomingAppointments.length>0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Calendar className="h-5 w-5" />Upcoming Appointments</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {upcomingAppointments.map(appt=>(
                <div key={appt.id} className="p-4 flex items-center gap-3">
                  {appt.visitor?.photo_url ? (<img src={appt.visitor.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center"><span className="text-lg font-medium text-gray-500">{(appt.visitor?.full_name||'—').charAt(0).toUpperCase()}</span></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{appt.visitor?.full_name||'—'}</p>
                    <p className="text-sm text-gray-600">{appt.employee?.full_name||'—'}</p>
                    <p className="text-xs text-gray-500">{appt.appointment_date} {appt.expected_arrival}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{appt.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setSelectedVisit(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Visitor Details</h3>
              <button onClick={()=>setSelectedVisit(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="h-6 w-6 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                {selectedVisit.visitor?.photo_url ? (<img src={selectedVisit.visitor.photo_url} alt="" className="h-20 w-20 rounded-2xl object-cover border border-gray-200" />) : (
                  <div className="h-20 w-20 rounded-2xl bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">{(selectedVisit.visitor?.full_name||'?').charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{selectedVisit.visitor?.full_name||'—'}</h4>
                  <p className="text-gray-600">{selectedVisit.visitor?.visitor_organization||'No company'}</p>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium mt-2 ${STATUS_STYLES[selectedVisit.status]?.bg} ${STATUS_STYLES[selectedVisit.status]?.text} ${STATUS_STYLES[selectedVisit.status]?.border}`}>{selectedVisit.status.replace('_',' ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailItem icon={Phone} label="Phone" value={selectedVisit.visitor?.phone||'—'} />
                <DetailItem icon={Mail} label="Email" value={selectedVisit.visitor?.email||'—'} />
                <DetailItem icon={UserCheck} label="Host" value={selectedVisit.employee?.full_name||'—'} />
                <DetailItem icon={MapPin} label="Department" value={selectedVisit.employee?.department||'—'} />
                <DetailItem icon={MapPin} label="Office" value={selectedVisit.employee?.office_location||'—'} />
                <DetailItem icon={ClipboardCheck} label="Purpose" value={selectedVisit.purpose||'—'} />
                <DetailItem icon={Clock} label="Arrival" value={selectedVisit.check_in_time?new Date(selectedVisit.check_in_time).toLocaleString():'—'} />
                <DetailItem icon={LogOut} label="Departure" value={selectedVisit.check_out_time?new Date(selectedVisit.check_out_time).toLocaleString():'—'} />
              </div>

              {selectedVisit.badge && (
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-blue-600" />Badge Information</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-gray-500">Badge #</p><p className="font-mono font-semibold text-gray-900">{selectedVisit.badge.badge_number}</p></div>
                    <div><p className="text-gray-500">Status</p><p className="font-semibold text-gray-900">{selectedVisit.badge.badge_status}</p></div>
                    <div><p className="text-gray-500">Issued</p><p className="text-gray-900">{new Date(selectedVisit.badge.issued_at).toLocaleDateString()}</p></div>
                    <div><p className="text-gray-500">Expires</p><p className="text-gray-900">{new Date(selectedVisit.badge.expires_at).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={()=>handlePrintBadge(selectedVisit)} className={`${TOUCH} bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm py-2 px-4`}><Printer className="h-4 w-4" />Print Badge</button>
                    <button onClick={()=>handleReprintBadge(selectedVisit.badge!.id)} className={`${TOUCH} bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 text-sm py-2 px-4`}><RefreshCw className="h-4 w-4" />Reprint</button>
                    <button onClick={()=>handleCancelBadge(selectedVisit.badge!.id,selectedVisit.id)} className={`${TOUCH} bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 text-sm py-2 px-4`}><X className="h-4 w-4" />Cancel Badge</button>
                  </div>
                </div>
              )}

              {selectedVisit.badge?.qr_token && (
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><QrCode className="h-5 w-5 text-blue-600" />QR Code</h5>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedVisit.badge.qr_token)}`} alt="QR Code" className="h-32 w-32" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (<ShortcutsModal onClose={()=>setShowShortcuts(false)} />)}
    </div>
  )
}
