import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/app-shell'

export const metadata: Metadata = {
  title: 'WOORI-HIP',
  description: '문서 관리 시스템 - 등록된 문서를 빠르게 검색하고 관리합니다.',
}

export const viewport: Viewport = {
  themeColor: '#0078D4',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-background antialiased font-sans">
        <AppShell>
          {children}
        </AppShell>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}