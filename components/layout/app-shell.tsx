'use client'

import { useState } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
  currentPage?: string
}

export function AppShell({ children, currentPage }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          currentPage={currentPage}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
