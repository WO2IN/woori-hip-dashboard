'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDataChanged } from '@/lib/data-events'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Upload, Search, Settings, FolderOpen, Folder, ChevronRight,
  ChevronDown, Building2, X, PanelLeftClose, PanelLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Company {
  name: string
  docTypes: { name: string; count: number }[]
}

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

const navItems = [
  { href: '/', label: '대시보드', icon: Home },
  { href: '/explorer', label: '문서 탐색기', icon: FolderOpen },
  { href: '/search', label: '문서 검색', icon: Search },
  { href: '/upload', label: '문서 등록', icon: Upload },
  { href: '/settings', label: '설정', icon: Settings },
]

export function Sidebar({open, onClose, collapsed, setCollapsed,}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [companies, setCompanies] = useState<string[]>([])
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [docCounts, setDocCounts] = useState<Record<string, Record<string, number>>>({})

  const loadSidebarData = useCallback(async () => {
    const [compRes, dtRes, docsRes] = await Promise.all([
      fetch('/api/config?name=companies', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=document-types', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/documents', { cache: 'no-store' }).then(r => r.json()),
    ])
    setCompanies(compRes.data || [])
    setDocTypes(dtRes.data || [])
    const counts: Record<string, Record<string, number>> = {}
    for (const doc of docsRes.data || []) {
      if (!counts[doc.company]) counts[doc.company] = {}
      counts[doc.company][doc.documentType] = (counts[doc.company][doc.documentType] || 0) + 1
    }
    setDocCounts(counts)
  }, [])

  useEffect(() => { loadSidebarData() }, [loadSidebarData])

  useDataChanged(() => { loadSidebarData() }, [loadSidebarData])
  
  useEffect(() => { 
    loadSidebarData() 
  }, [loadSidebarData])
  
  // 문서 탐색기 페이지 진입 시 사이드바 자동 접기
  useEffect(() => {
    if (pathname.startsWith('/explorer')) {
      setCollapsed(true)
    }
  }, [pathname, setCollapsed])
  
  useDataChanged(() => { 
    loadSidebarData() 
  }, [loadSidebarData])
  const toggleCompany = (name: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed lg:static top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-40',
        'flex flex-col overflow-hidden transition-[width,transform] duration-300 ease-in-out',
        collapsed ? 'lg:w-20' : 'lg:w-64',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
       <button
          onClick={() => setCollapsed(prev => !prev)}
        className={cn(
          "w-full flex items-center rounded-md text-sm transition-colors mb-2",
          collapsed
            ? "justify-center h-10"
            : "gap-2.5 px-3 h-10 hover:bg-sidebar-accent"
        )}
      >
        {collapsed ? (
          <PanelLeft className="w-4 h-4" />
        ) : (
          <>
            <PanelLeftClose className="w-4 h-4" />
            <span>사이드바 접기</span>
          </>
        )}
      </button>

        <ScrollArea className="flex-1 py-3">
          {/* Main nav */}
          <nav className="px-3 space-y-0.5 mb-4">
            {navItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center h-10 rounded-md text-sm transition-colors',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn(
                    'w-4 h-4 flex-shrink-0',
                    active ? 'text-sidebar-primary' : ''
                  )} />
                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-opacity duration-150",
                      collapsed ? "opacity-0 w-0" : "opacity-100 ml-2"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Company tree */}
          {companies.length > 0 && !collapsed && (
            <div className="px-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                업체
              </p>
              <div className="space-y-0.5">
                {companies.map(company => {
                  const expanded = expandedCompanies.has(company)
                  const companyDocs = docCounts[company] || {}
                  const total = Object.values(companyDocs).reduce((a, b) => a + b, 0)
                  return (
                    <div key={company}>
                      <button
                        onClick={() => toggleCompany(company)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors group"
                      >
                        {expanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        }
                        <Building2 className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{company}</span>
                        {total > 0 && (
                          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {total}
                          </span>
                        )}
                      </button>
                      {expanded && (
                        <div className="ml-6 mt-0.5 space-y-0.5 animate-fade-in-up">
                          {docTypes.map(dt => {
                            const count = companyDocs[dt] || 0
                            return (
                              <button
                                key={dt}
                                onClick={() => {
                                  if (collapsed) {
                                    setCollapsed(false)
                                  }
                                
                                  router.push(`/explorer?company=${encodeURIComponent(company)}&docType=${encodeURIComponent(dt)}`)
                                  onClose()
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
                              >
                                <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">{dt}</span>
                                {count > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {count}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Bottom version info */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          {!collapsed && (
            <p className="text-[11px] text-muted-foreground">
              문서 관리 시스템 v1.0
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
