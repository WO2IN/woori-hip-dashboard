'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Upload, Settings, FolderOpen, PanelLeftClose, PanelLeft,
  Users, PackageCheck, Network, Factory, ClipboardCheck, FileText,
  ScrollText, ChevronDown, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/components/auth/auth-context'

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

export function Sidebar({open, onClose, collapsed, setCollapsed,}: SidebarProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

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
          'fixed lg:static top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-[60]',
          'flex flex-col overflow-visible transition-[width,transform] duration-300 ease-in-out',
          collapsed ? 'w-20' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="
              lg:hidden
              absolute
              top-4
              right-4
              z-[100]
              h-8
              w-8
              flex
              items-center
              justify-center
              rounded-md
              hover:bg-sidebar-accent
            "
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCollapsed(prev => !prev)}
          className="
            hidden
            lg:flex
            absolute
            top-16
            -right-3
            z-[100]
            h-7
            w-7
            items-center
            justify-center
            rounded-full
            border
            bg-background
            shadow-md
            hover:bg-accent
          "
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
        <ScrollArea className="flex-1 py-3 pt-14 lg:pt-3">
          <nav className="px-3 space-y-1">
            {[
              { href: '/', label: '대시보드', icon: Home, minRole: 'viewer' as const },
              {
                label: '업무관리', icon: PackageCheck, minRole: 'viewer' as const, children: [
                  { href: '/shipment', label: '입/출고관리', icon: PackageCheck, minRole: 'viewer' as const },
                  { href: '#', label: '생산관리', icon: Factory, minRole: 'viewer' as const },
                  { href: '#', label: '품질관리', icon: ClipboardCheck, minRole: 'viewer' as const },
                  { href: '#', label: '출하관리', icon: Upload, minRole: 'viewer' as const },
                ],
              },
              {
                label: '문서관리', icon: FileText, minRole: 'viewer' as const, children: [
                  { href: '/explorer', label: '문서탐색기', icon: FolderOpen, minRole: 'viewer' as const },
                  { href: '/upload', label: '문서등록', icon: Upload, minRole: 'editor' as const },
                  { href: '#', label: '이력카드', icon: FileText, minRole: 'viewer' as const },
                  { href: '#', label: '성적서', icon: ClipboardCheck, minRole: 'viewer' as const },
                ],
              },
              {
                label: '조직/사용자', icon: Users, minRole: 'viewer' as const, children: [
                  { href: '/organization', label: '조직도', icon: Network, minRole: 'viewer' as const },
                  { href: '/admin/users', label: '사용자 관리', icon: Users, minRole: 'admin' as const },
                ],
              },
              {
                label: '시스템관리', icon: Settings, minRole: 'viewer' as const, children: [
                  { href: '/settings', label: '설정', icon: Settings, minRole: 'editor' as const },
                  { href: '/system-logs', label: '시스템 로그', icon: ScrollText, minRole: 'admin' as const },
                ],
              },
            ].map((section) => {
              const LEVELS = { viewer: 1, editor: 2, admin: 3 }
              if (user && LEVELS[user.role] < LEVELS[section.minRole]) return null
              const SectionIcon = section.icon
              const isSectionActive = section.href
                ? pathname === section.href
                : section.children?.some(item => item.href !== '#' && (pathname === item.href || pathname.startsWith(item.href)))
              const visibleChildren = section.children?.filter(item => !user || LEVELS[user.role] >= LEVELS[item.minRole])

              if (!section.children) {
                return (
                  <Link key={section.label} href={section.href ?? '#'} onClick={onClose} className={cn(
                    'flex items-center h-10 rounded-md px-3 text-sm transition-colors',
                    isSectionActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                    collapsed && 'justify-center px-0'
                  )}>
                    <SectionIcon className="w-4 h-4 flex-shrink-0" />
                    <span className={cn('overflow-hidden whitespace-nowrap transition-opacity duration-150', collapsed ? 'opacity-0 w-0' : 'opacity-100 ml-2 font-medium')}>
                      {section.label}
                    </span>
                  </Link>
                )
              }

              const isOpen = openSections[section.label] ?? false
              return (
                <div key={section.label}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`sidebar-section-${section.label}`}
                    onClick={() => setOpenSections(prev => ({ ...prev, [section.label]: !isOpen }))}
                    className={cn(
                      'flex w-full items-center h-10 rounded-md text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isSectionActive && 'bg-sidebar-accent/40'
                    )}
                  >
                    <SectionIcon className="w-4 h-4 flex-shrink-0" />
                    <span className={cn('overflow-hidden whitespace-nowrap transition-opacity duration-150', collapsed ? 'opacity-0 w-0' : 'opacity-100 ml-2 font-medium')}>
                      {section.label}
                    </span>
                    {!collapsed && (isOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                  </button>
                  {!collapsed && isOpen && visibleChildren && (
                    <div id={`sidebar-section-${section.label}`} className="ml-5 pl-3 border-l border-sidebar-border space-y-0.5">
                      {visibleChildren.map(item => {
                        const ItemIcon = item.icon
                        const active = item.href !== '#' && (pathname === item.href || pathname.startsWith(item.href))
                        return (
                          <Link key={item.label} href={item.href} onClick={onClose} className={cn(
                            'flex items-center h-9 rounded-md px-3 text-sm transition-colors',
                            active ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                          )}>
                            <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="ml-2 truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
      </ScrollArea>
      {/* Bottom version info */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-sidebar-primary">W</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              WOORI-HIP <span className="opacity-60">v1.1</span>
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-5 h-5 rounded-md bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-sidebar-primary">W</span>
            </div>
          </div>
        )}
      </div>

      </aside>
      </>
      )
}
