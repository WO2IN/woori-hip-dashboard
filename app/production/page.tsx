'use client'

import { Factory } from 'lucide-react'

export default function ProductionPage() {
  return (
    <main className="flex min-h-full items-center justify-center bg-muted/20 p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-10 text-center shadow-sm">
        <Factory className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">생산관리</h1>
        <p className="mt-3 text-muted-foreground">현재 개발중입니다.</p>
      </section>
    </main>
  )
}
