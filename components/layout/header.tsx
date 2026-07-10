'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Search, Bell, Settings, FileText, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'  
import Image from "next/image"

interface HeaderProps {
  currentPage?: string
  onMenuToggle?: () => void
}

export function Header({ currentPage, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-40 shadow-sm">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="메뉴 열기"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Logo */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-3 mr-0 cursor-pointer"
        aria-label="대시보드로 이동"
      >
        <div className="w-[95px] h-[50px] flex items-center justify-center flex-shrink-0">
          <Image
            src={dark ? "/logo-dark.png" : "/logo.png"}
            width={120}
            height={72}
            alt="logo"
            className="object-contain"
            priority
          />
        </div>
      </button>

      {/* Current page indicator */}
      {currentPage && (
        <div className="hidden md:flex items-center gap-2">
          <span className="text-muted-foreground text-lg">/</span>
          <span className="text-lg font-semibold text-foreground">{currentPage}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Search bar */}
      {searchOpen ? (
        <form onSubmit={handleSearch} className="flex items-center gap-2 animate-fade-in-up">
          <Input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="문서 검색..."
            className="w-64 h-8 text-sm"
            onBlur={() => { if (!searchQuery) setSearchOpen(false) }}
          />
          <Button type="submit" size="sm" variant="default" className="h-8">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline text-sm ml-1.5">검색</span>
        </Button>
      )}

      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDark}
        className="text-muted-foreground hover:text-foreground w-8 h-8"
        aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    </header>
  )
}
