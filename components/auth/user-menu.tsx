'use client'

import { useAuth } from '@/components/auth/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ShieldCheck, Eye, Pencil, ChevronDown } from 'lucide-react'
import { UserRole } from '@/lib/types'

const ROLE_LABEL: Record<UserRole, string> = {
  viewer: '뷰어',
  editor: '편집자',
  admin: '관리자',
}

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  viewer: <Eye className="w-3 h-3" />,
  editor: <Pencil className="w-3 h-3" />,
  admin: <ShieldCheck className="w-3 h-3" />,
}

const ROLE_COLOR: Record<UserRole, { text: string; bg: string; dot: string }> = {
  viewer: { text: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
  editor: { text: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  admin:  { text: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
}

function getInitials(name: string) {
  return name.slice(0, 1).toUpperCase()
}

export function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null

  const roleStyle = ROLE_COLOR[user.role]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="사용자 메뉴"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold text-[13px]">
          {getInitials(user.displayName)}
        </div>

        {/* Name + role */}
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[13px] font-semibold text-foreground leading-none">
            {user.displayName}
          </span>
          <span className={`flex items-center gap-1 text-[10px] font-medium leading-none ${roleStyle.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
            {ROLE_LABEL[user.role]}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block group-data-[state=open]:rotate-180 transition-transform" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-52 p-1.5">
        {/* Profile header */}
        <div className="px-2.5 py-2 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold text-base">
              {getInitials(user.displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-snug">
                {user.displayName}
              </p>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${roleStyle.text} ${roleStyle.bg}`}>
                {ROLE_ICON[user.role]}
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="mx-1 my-1" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={logout}
            className="rounded-lg cursor-pointer gap-2.5 text-[13px] text-destructive focus:text-destructive focus:bg-destructive/10 px-2.5 py-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
